package fr.royaumes;

import static fr.royaumes.Database.*;
import static fr.royaumes.Json.*;
import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HttpIntegrationTest {
  static final Path FILE;

  static {
    try {
      FILE = Files.createTempDirectory("royaumes-java-test-").resolve("test.sqlite");
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry p) {
    p.add("royaumes.database", () -> FILE.toString());
    p.add("royaumes.open-access", () -> "false");
    p.add("royaumes.origin", () -> "http://localhost:3102");
  }

  @Value("${local.server.port}")
  int port;

  @Autowired Database db;
  @Autowired Campaigns campaigns;
  @Autowired Passwords passwords;
  final HttpClient client = HttpClient.newHttpClient();
  static final String PASSWORD = "Test fixture password 123!";

  record Reply(int status, ObjectNode body, String cookie, HttpHeaders headers) {}

  Reply request(String path, Object body, String cookie, String origin) throws Exception {
    var builder =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .header("Cookie", cookie);
    if (body != null) {
      if (origin != null) builder.header("Origin", origin);
      builder
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(body.toString()));
    } else builder.GET();
    var response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    var json = MAPPER.readTree(response.body());
    return new Reply(
        response.statusCode(),
        json.isObject() ? object(json) : obj(),
        response.headers().firstValue("set-cookie").orElse("").split(";")[0],
        response.headers());
  }

  Reply post(String path, ObjectNode body, String cookie) throws Exception {
    return request(path, body, cookie, "http://localhost:3102");
  }

  Reply login(String username) throws Exception {
    return post(
        "/api/auth/sign-in/username",
        obj("username", username, "password", PASSWORD, "rememberMe", true),
        "");
  }

  @BeforeEach
  void seed() {
    String hash = passwords.hash(PASSWORD);
    db.transaction(
        c -> {
          for (var table :
              new String[] {
                "java_sessions", "java_rate_limits", "memberships", "campaigns", "account", "user"
              }) update(c, "DELETE FROM " + table);
          for (var id : new String[] {"gm", "p1", "p2", "other"})
            AccountService.insert(
                c,
                id,
                id.equals("gm") ? "gamemaster" : id.equals("other") ? "othergm" : id + "test",
                hash,
                0);
          var state =
              campaigns.create(
                  "gm", "GM", "gondor", "Test", "Troisième Âge · 3018", System.currentTimeMillis());
          campaigns.addPlayer(state, "p1", "Joueur 1", "rohan");
          campaigns.addPlayer(state, "p2", "Joueur 2", "elves");
          update(
              c,
              "INSERT INTO campaigns VALUES(?,?,?,?,0)",
              "c1",
              "gm",
              "0123456789ABCDEF",
              state.toString());
          for (var id : new String[] {"gm", "p1", "p2"})
            update(c, "INSERT INTO memberships VALUES(?,?)", id, "c1");
          return null;
        });
  }

  @Test
  void authenticationAndCsrf() throws Exception {
    assertEquals(401, request("/api/game", null, "", null).status());
    assertEquals(
        403,
        request(
                "/api/auth/sign-in/username",
                obj("username", "gamemaster", "password", PASSWORD),
                "",
                "https://evil.invalid")
            .status());
    var gm = login("gamemaster");
    assertEquals(200, gm.status());
    String cookieHeader = gm.headers.firstValue("set-cookie").orElseThrow();
    assertTrue(cookieHeader.contains("HttpOnly"));
    assertTrue(cookieHeader.contains("SameSite=Lax"));
    assertTrue(cookieHeader.contains("Max-Age="));
    assertEquals(
        403,
        request("/api/game", obj("type", "legendary", "enabled", true), gm.cookie(), null)
            .status());
    assertEquals(403, post("/api/auth/sign-up/email", obj(), gm.cookie()).status());
    assertEquals(
        413, request("/api/game", "x".repeat(5000), gm.cookie(), "http://localhost:3102").status());
    assertEquals(400, request("/api/game", "{", gm.cookie(), "http://localhost:3102").status());
    assertEquals(200, post("/api/auth/sign-out", obj(), gm.cookie()).status());
    assertEquals(401, request("/api/game", null, gm.cookie(), null).status());
  }

  ObjectNode savedCampaign() {
    return db.read(
        c -> parse((String) one(c, "SELECT state FROM campaigns WHERE id=?", "c1").get("state")));
  }

  void editFixture(java.util.function.Consumer<ObjectNode> edit) {
    db.transaction(
        c -> {
          var state =
              parse((String) one(c, "SELECT state FROM campaigns WHERE id=?", "c1").get("state"));
          edit.accept(state);
          update(c, "UPDATE campaigns SET state=? WHERE id=?", state.toString(), "c1");
          return null;
        });
  }

  @Test
  void rejectedOrderRefundsExactlyOnceEvenAfterPriceChanges() throws Exception {
    editFixture(s -> s.put("last", System.currentTimeMillis() + 600000));
    var gm = login("gamemaster");
    var p = login("p1test");
    var view = request("/api/game", null, p.cookie(), null).body().path("campaign");
    String city = text(view.path("cities").get(0), "id");
    var initialWallet = view.path("players").path("p1").path("wallet").deepCopy();
    var ordered =
        post(
            "/api/game",
            obj("type", "recruit", "city", city, "unit", "militia", "count", 2),
            p.cookie());
    assertEquals(200, ordered.status());
    String order = text(ordered.body().path("campaign").path("orders").get(0), "id");
    editFixture(
        s ->
            ensure(ensure(ensure(s, "balance"), "units"), "militia")
                .set("cost", obj("gold", 999, "wood", 0, "stone", 0, "iron", 0, "food", 0)));
    assertEquals(
        400, post("/api/game", obj("type", "rejectOrder", "id", order), p.cookie()).status());
    assertEquals(
        200, post("/api/game", obj("type", "rejectOrder", "id", order), gm.cookie()).status());
    var refunded = savedCampaign();
    for (var resource : Catalog.RES)
      assertEquals(
          initialWallet.path(resource).asDouble(),
          refunded.path("players").path("p1").path("wallet").path(resource).asDouble());
    assertEquals(
        400, post("/api/game", obj("type", "rejectOrder", "id", order), gm.cookie()).status());
    assertEquals(400, post("/api/game", obj("type", "deliver", "id", order), gm.cookie()).status());
    assertEquals(refunded, savedCampaign());
  }

  @Test
  void depositsArePrivateAndCannotBeCreditedTwice() throws Exception {
    editFixture(s -> s.put("last", System.currentTimeMillis() + 600000));
    var gm = login("gamemaster");
    var p1 = login("p1test");
    var p2 = login("p2test");
    double before =
        savedCampaign().path("players").path("p1").path("wallet").path("gold").asDouble();
    var deposit =
        post("/api/game", obj("type", "deposit", "resource", "gold", "amount", 100), p1.cookie());
    assertEquals(200, deposit.status());
    String id = text(deposit.body().path("campaign").path("deposits").get(0), "id");
    assertEquals(
        0,
        request("/api/game", null, p2.cookie(), null)
            .body()
            .path("campaign")
            .path("deposits")
            .size());
    var approve = obj("type", "reviewDeposit", "id", id, "accept", true);
    assertEquals(400, post("/api/game", approve, p1.cookie()).status());
    try (var pool = Executors.newFixedThreadPool(2)) {
      var a = pool.submit(() -> post("/api/game", approve, gm.cookie()).status());
      var b = pool.submit(() -> post("/api/game", approve, gm.cookie()).status());
      assertEquals(
          java.util.Set.of(200, 400), new java.util.HashSet<>(java.util.List.of(a.get(), b.get())));
    }
    assertEquals(
        before + 100,
        savedCampaign().path("players").path("p1").path("wallet").path("gold").asDouble());
    var declined =
        post("/api/game", obj("type", "deposit", "resource", "gold", "amount", 500), p1.cookie());
    String declinedId = text(declined.body().path("campaign").path("deposits").get(0), "id");
    assertEquals(
        200,
        post(
                "/api/game",
                obj("type", "reviewDeposit", "id", declinedId, "accept", false),
                gm.cookie())
            .status());
    assertEquals(
        before + 100,
        savedCampaign().path("players").path("p1").path("wallet").path("gold").asDouble());
  }

  @Test
  void invalidCommandsNeverPartiallyWriteCampaign() throws Exception {
    var p = login("p1test");
    var state = savedCampaign();
    String own = "", foreign = text(state.path("cities").get(0), "id");
    for (var c : state.path("cities")) if (text(c, "owner").equals("p1")) own = text(c, "id");
    for (var action :
        new ObjectNode[] {
          obj("type", "recruit", "city", own, "unit", "militia", "count", -1),
          obj("type", "recruit", "city", own, "unit", "militia", "count", 1.5),
          obj("type", "recruit", "city", own, "unit", "militia", "count", 100001),
          obj("type", "upgrade", "city", own, "building", "unknown"),
          obj("type", "transfer", "city", own, "to", foreign, "unit", "militia", "count", 1),
          obj("type", "deposit", "resource", "gold", "amount", 0),
          obj("type", "deposit", "resource", "diamonds", "amount", 5),
          obj("type", "period", "age", 3, "year", 3019)
        }) {
      assertEquals(400, post("/api/game", action, p.cookie()).status(), action.toString());
      assertEquals(
          state, savedCampaign(), "A rejected command must leave persisted state unchanged");
    }
  }

  @Test
  void buildingQueueHonoursLevelFortyAndCompletesOffline() throws Exception {
    editFixture(
        s -> {
          object(s.path("players").path("p1"))
              .set(
                  "wallet",
                  obj(
                      "gold", 10000000, "wood", 10000000, "stone", 10000000, "iron", 10000000,
                      "food", 10000000));
          for (var c : s.path("cities"))
            if (text(c, "owner").equals("p1")) object(c.path("levels")).put("farm", 38);
        });
    var p = login("p1test");
    var view = request("/api/game", null, p.cookie(), null).body().path("campaign");
    String city = text(view.path("cities").get(0), "id");
    var upgrade = obj("type", "upgrade", "city", city, "building", "farm");
    assertEquals(200, post("/api/game", upgrade, p.cookie()).status());
    var queued = post("/api/game", upgrade, p.cookie());
    assertEquals(200, queued.status());
    assertEquals(
        40,
        queued
            .body()
            .path("campaign")
            .path("cities")
            .get(0)
            .path("queue")
            .get(0)
            .path("level")
            .asInt());
    var before = savedCampaign();
    assertEquals(400, post("/api/game", upgrade, p.cookie()).status());
    assertEquals(before, savedCampaign());
    editFixture(
        s -> {
          long past = System.currentTimeMillis() - 86400000;
          s.put("last", past);
          for (var c : s.path("cities"))
            if (text(c, "id").equals(city)) {
              object(c.path("build")).put("start", past - 1000).put("end", past + 1000);
            }
        });
    var settled =
        request("/api/game", null, p.cookie(), null).body().path("campaign").path("cities").get(0);
    assertEquals(40, settled.path("levels").path("farm").asInt());
    assertTrue(settled.path("build").isNull());
    assertEquals(0, settled.path("queue").size());
    // A subsequent write must persist the same settled result.
    assertEquals(
        200,
        post("/api/game", obj("type", "deposit", "resource", "gold", "amount", 1), p.cookie())
            .status());
    var reloaded =
        request("/api/game", null, p.cookie(), null).body().path("campaign").path("cities").get(0);
    assertEquals(40, reloaded.path("levels").path("farm").asInt());
  }

  @Test
  void cancellingQueueOnlyRemovesLastJobAndRefundsItsPaidCost() throws Exception {
    var p = login("p1test");
    String city =
        text(
            request("/api/game", null, p.cookie(), null)
                .body()
                .path("campaign")
                .path("cities")
                .get(0),
            "id");
    for (int i = 0; i < 3; i++)
      assertEquals(
          200,
          post("/api/game", obj("type", "upgrade", "city", city, "building", "farm"), p.cookie())
              .status());
    var view = request("/api/game", null, p.cookie(), null).body().path("campaign");
    var queue = view.path("cities").get(0).path("queue");
    assertEquals(2, queue.size());
    assertEquals(
        400,
        post(
                "/api/game",
                obj("type", "cancelQueuedBuild", "city", city, "id", text(queue.get(0), "id")),
                p.cookie())
            .status());
    var initial = savedCampaign().path("players").path("p1").path("wallet");
    var cancelled =
        post(
            "/api/game",
            obj("type", "cancelQueuedBuild", "city", city, "id", text(queue.get(1), "id")),
            p.cookie());
    assertEquals(200, cancelled.status());
    assertEquals(1, cancelled.body().path("campaign").path("cities").get(0).path("queue").size());
    var wallet = cancelled.body().path("campaign").path("players").path("p1").path("wallet");
    for (var resource : Catalog.RES) {
      double expected =
          initial.path(resource).asDouble() + queue.get(1).path("paid").path(resource).asDouble();
      assertEquals(
          expected,
          wallet.path(resource).asDouble(),
          2,
          "Refund plus subsecond production: " + resource);
    }
    var saved = savedCampaign();
    assertEquals(
        400,
        post(
                "/api/game",
                obj("type", "cancelQueuedBuild", "city", city, "id", text(queue.get(1), "id")),
                p.cookie())
            .status());
    assertEquals(saved, savedCampaign());
  }

  @Test
  void isolationAndAtomicCommands() throws Exception {
    var gm = login("gamemaster");
    var p = login("p1test");
    var view = request("/api/game", null, p.cookie(), null).body().path("campaign");
    assertEquals(1, view.path("players").size());
    assertFalse(view.toString().contains("Joueur 2"));
    assertFalse(view.toString().contains("Minas Tirith"));
    assertEquals(403, request("/api/accounts", null, p.cookie(), null).status());
    var full = request("/api/game", null, gm.cookie(), null).body().path("campaign");
    String foreign = text(full.path("cities").get(0), "id"),
        own = text(view.path("cities").get(0), "id");
    assertEquals(
        400,
        post("/api/game", obj("type", "upgrade", "city", foreign, "building", "farm"), p.cookie())
            .status());
    assertEquals(
        400, post("/api/game", obj("type", "legendary", "enabled", true), p.cookie()).status());
    assertEquals(
        400,
        post(
                "/api/game",
                obj("type", "recruit", "city", own, "unit", "militia", "count", -1),
                p.cookie())
            .status());
    var ordered =
        post(
            "/api/game",
            obj("type", "recruit", "city", own, "unit", "militia", "count", 1),
            p.cookie());
    assertEquals(200, ordered.status());
    String order = text(ordered.body().path("campaign").path("orders").get(0), "id");
    try (var pool = Executors.newFixedThreadPool(2)) {
      var a =
          pool.submit(
              () -> post("/api/game", obj("type", "deliver", "id", order), gm.cookie()).status());
      var b =
          pool.submit(
              () -> post("/api/game", obj("type", "deliver", "id", order), gm.cookie()).status());
      var results = new java.util.HashSet<>(java.util.List.of(a.get(), b.get()));
      assertEquals(java.util.Set.of(200, 400), results);
    }
    var current = request("/api/game", null, p.cookie(), null).body().path("campaign");
    assertEquals(25, current.path("cities").get(0).path("troops").path("militia").asInt());
  }

  @Test
  void managedAccountsAndPasswordCompatibility() throws Exception {
    var gm = login("gamemaster");
    var p = login("p1test");
    assertEquals(
        404, post("/api/accounts", obj("type", "reset", "userId", "gm"), gm.cookie()).status());
    var created =
        post(
            "/api/accounts",
            obj("type", "create", "username", "newplayer", "faction", "dwarves"),
            gm.cookie());
    assertEquals(200, created.status());
    assertTrue(text(created.body(), "password").length() >= 12);
    var newLogin =
        post(
            "/api/auth/sign-in/username",
            obj("username", "newplayer", "password", text(created.body(), "password")),
            "");
    assertEquals(200, newLogin.status());
    var accounts = request("/api/accounts", null, gm.cookie(), null).body();
    assertFalse(accounts.toString().contains("password"));
    assertFalse(accounts.toString().contains("email"));
    var reset = post("/api/accounts", obj("type", "reset", "userId", "p1"), gm.cookie());
    assertEquals(200, reset.status());
    assertEquals(401, request("/api/game", null, p.cookie(), null).status());
    assertEquals(401, login("p1test").status());
    assertEquals(
        200,
        post(
                "/api/auth/sign-in/username",
                obj("username", "p1test", "password", text(reset.body(), "password")),
                "")
            .status());
    assertEquals(200, login("gamemaster").status());
  }

  @Test
  void accountCreationRejectsCaseInsensitiveLegacyDuplicates() throws Exception {
    db.transaction(
        c -> {
          update(c, "UPDATE user SET username='MixedCase' WHERE id='p1'");
          return null;
        });
    var gm = login("gamemaster");
    var before = savedCampaign();
    assertEquals(
        400,
        post(
                "/api/accounts",
                obj("type", "create", "username", "mixedcase", "faction", "rohan"),
                gm.cookie())
            .status());
    assertEquals(before, savedCampaign());
    assertEquals(200, login("mixedcase").status());
  }

  @Test
  void foundingTransfersAndLossesKeepOwnershipAndCounts() throws Exception {
    editFixture(
        s -> {
          s.put("last", System.currentTimeMillis() + 600000);
          for (var resource : Catalog.RES)
            object(s.path("players").path("p1").path("wallet")).put(resource, 10000);
        });
    var player = login("p1test");
    var gm = login("gamemaster");
    var founded = post("/api/game", obj("type", "found", "name", "Ville de test"), player.cookie());
    assertEquals(200, founded.status());
    var cities = founded.body().path("campaign").path("cities");
    var destination = cities.get(cities.size() - 1);
    String source = text(cities.get(0), "id"), target = text(destination, "id");
    assertEquals("p1", text(destination, "owner"));
    for (var level : destination.path("levels")) assertEquals(1, level.asInt());
    assertEquals(
        8500,
        founded
            .body()
            .path("campaign")
            .path("players")
            .path("p1")
            .path("wallet")
            .path("gold")
            .asInt());
    var moved =
        post(
            "/api/game",
            obj("type", "transfer", "city", source, "to", target, "unit", "militia", "count", 2),
            player.cookie());
    assertEquals(200, moved.status());
    var loss = obj("type", "loss", "city", target, "unit", "militia", "count", 1);
    assertEquals(400, post("/api/game", loss, player.cookie()).status());
    assertEquals(200, post("/api/game", loss, gm.cookie()).status());
    var after = request("/api/game", null, player.cookie(), null).body().path("campaign");
    for (var city : after.path("cities")) {
      assertEquals("p1", text(city, "owner"));
      if (text(city, "id").equals(target))
        assertEquals(1, city.path("troops").path("militia").asInt());
    }
  }

  @Test
  void encountersAreGmOnlyUniqueAndPrivate() throws Exception {
    var gm = login("gamemaster");
    var player = login("p1test");
    var enable = obj("type", "legendary", "enabled", true);
    var encounter = obj("type", "encounter", "unit", "durins_bane", "location", "Moria");
    assertEquals(400, post("/api/game", encounter, gm.cookie()).status());
    assertEquals(200, post("/api/game", enable, gm.cookie()).status());
    assertEquals(400, post("/api/game", encounter, player.cookie()).status());
    var created = post("/api/game", encounter, gm.cookie());
    assertEquals(200, created.status());
    var defeat =
        obj(
            "type",
            "defeatEncounter",
            "id",
            text(created.body().path("campaign").path("encounters").get(0), "id"));
    assertEquals(200, post("/api/game", defeat, gm.cookie()).status());
    assertEquals(400, post("/api/game", defeat, gm.cookie()).status());
    assertEquals(400, post("/api/game", encounter, gm.cookie()).status());
    assertTrue(
        request("/api/game", null, player.cookie(), null)
            .body()
            .path("campaign")
            .path("encounters")
            .isEmpty());
    assertEquals(
        200,
        post("/api/game", obj("type", "period", "age", 3, "year", 3019), gm.cookie()).status());
  }

  @Test
  void changingPasswordRevokesOtherSessions() throws Exception {
    var first = login("p1test");
    var second = login("p1test");
    assertEquals(
        200,
        post(
                "/api/auth/change-password",
                obj(
                    "currentPassword",
                    PASSWORD,
                    "newPassword",
                    "Another test password 456!",
                    "revokeOtherSessions",
                    true),
                first.cookie())
            .status());
    assertEquals(200, request("/api/game", null, first.cookie(), null).status());
    assertEquals(401, request("/api/game", null, second.cookie(), null).status());
    assertEquals(401, login("p1test").status());
    assertEquals(
        200,
        post(
                "/api/auth/sign-in/username",
                obj("username", "p1test", "password", "Another test password 456!"),
                "")
            .status());
  }

  @Test
  void creationJoiningAndOtherCampaignIsolation() throws Exception {
    var other = login("othergm");
    assertTrue(request("/api/game", null, other.cookie(), null).body().path("campaign").isNull());
    var made =
        post(
            "/api/game",
            obj("type", "create", "faction", "mordor", "name", "Autre campagne"),
            other.cookie());
    assertEquals(200, made.status());
    assertEquals(
        404, post("/api/accounts", obj("type", "reset", "userId", "p1"), other.cookie()).status());
    db.transaction(
        c -> {
          AccountService.insert(c, "joiner", "joiner", passwords.hash(PASSWORD), 0);
          return null;
        });
    var joiner = login("joiner");
    String code = text(made.body(), "code");
    assertEquals(200, request("/api/game?invite=" + code, null, joiner.cookie(), null).status());
    var joined =
        post("/api/game", obj("type", "join", "code", code, "faction", "harad"), joiner.cookie());
    assertEquals(200, joined.status());
    assertFalse(joined.body().has("code"));
    assertEquals(1, joined.body().path("campaign").path("players").size());
  }

  @Test
  void rateLimitsAreNotBypassedByUsernameCase() throws Exception {
    for (int i = 0; i < 5; i++)
      assertEquals(
          401,
          post(
                  "/api/auth/sign-in/username",
                  obj("username", i % 2 == 0 ? "GAMEMASTER" : "gamemaster", "password", "wrong"),
                  "")
              .status());
    assertEquals(429, login("gamemaster").status());
  }

  @Test
  void everyBalanceCategoryPersistsAndCanBeRestored() throws Exception {
    var gm = login("gamemaster");
    var player = login("p1test");
    var cost = obj("gold", 42, "wood", 0, "stone", 0, "iron", 0, "food", 0);
    var stats = obj("attack", 37, "defense", 12, "hp", 100, "range", 1, "speed", 2, "morale", 70);
    var production = obj("gold", 0, "wood", 10, "stone", 0, "iron", 0, "food", 20);
    var bonus = obj("attack", 5, "defense", 0, "hp", 0, "range", 0, "speed", 0, "morale", 0);
    String[] types = {"balanceBuilding", "balanceUnit", "balanceFaction"};
    String[] groups = {"buildings", "units", "factions"};
    String[] ids = {"farm", "militia", "rohan"};
    ObjectNode[] values = {
      obj("cost", cost, "timePercent", 50),
      obj("cost", cost, "stats", stats),
      obj("production", production, "stats", bonus, "recruitGold", -10, "upkeepFood", -10)
    };
    int revision =
        request("/api/game", null, gm.cookie(), null)
            .body()
            .path("campaign")
            .path("balance")
            .path("revision")
            .asInt();
    for (int i = 0; i < types.length; i++) {
      var command = obj("type", types[i], "id", ids[i], "value", values[i], "revision", revision);
      assertEquals(400, post("/api/game", command, player.cookie()).status());
      assertEquals(200, post("/api/game", command, gm.cookie()).status());
      assertEquals(
          400,
          post("/api/game", command, gm.cookie()).status(),
          "Stale settings must not overwrite changes");
      revision++;
      var visible =
          request("/api/game", null, player.cookie(), null).body().path("campaign").path("balance");
      assertEquals(values[i], visible.path(groups[i]).path(ids[i]));
      assertEquals(revision, visible.path("revision").asInt());
    }
    // Reopen storage independently, proving settings do not live only in a service cache.
    var reopened = new Database(FILE.toString());
    var stored =
        reopened.read(
            c ->
                parse(
                    (String) one(c, "SELECT state FROM campaigns WHERE id=?", "c1").get("state")));
    for (int i = 0; i < types.length; i++) {
      assertEquals(values[i], stored.path("balance").path(groups[i]).path(ids[i]));
      assertEquals(
          200,
          post(
                  "/api/game",
                  obj("type", types[i], "id", ids[i], "value", null, "revision", revision++),
                  gm.cookie())
              .status());
    }
    var restored =
        request("/api/game", null, player.cookie(), null).body().path("campaign").path("balance");
    for (int i = 0; i < types.length; i++) assertFalse(restored.path(groups[i]).has(ids[i]));
  }
}
