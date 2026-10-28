package fr.royaumes;

import static fr.royaumes.Database.*;
import static fr.royaumes.Json.*;
import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OpenAccessHttpTest {
  static final Path FILE;

  static {
    try {
      FILE = Files.createTempDirectory("royaumes-open-").resolve("test.sqlite");
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry p) {
    p.add("royaumes.database", () -> FILE.toString());
    p.add("royaumes.origin", () -> "http://localhost:3102");
    p.add("royaumes.open-access", () -> "true");
  }

  @Value("${local.server.port}")
  int port;

  @Autowired Database db;

  record Reply(int status, com.fasterxml.jackson.databind.JsonNode body) {}

  Reply request(String path, Object action, String profile, String origin) throws Exception {
    var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
    if (profile != null) builder.header("X-Realm-Profile", profile);
    if (action != null)
      builder
          .header("Origin", origin)
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(action.toString()));
    var response =
        HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofString());
    assertTrue(response.headers().allValues("set-cookie").isEmpty());
    return new Reply(response.statusCode(), MAPPER.readTree(response.body()));
  }

  Reply post(String path, Object action, String profile) throws Exception {
    return request(path, action, profile, "http://localhost:3102");
  }

  @Test
  void publicProfilesPersistWithoutPasswordsAndKeepGameActions() throws Exception {
    var initial = request("/api/game", null, null, null);
    assertEquals(200, initial.status());
    String gm = text(initial.body().path("user"), "id");
    assertEquals(gm, text(initial.body().path("campaign"), "gm"));
    var created =
        post("/api/accounts", obj("type", "create", "username", "friend", "faction", "rohan"), gm);
    assertEquals(200, created.status());
    assertFalse(created.body().has("password"));
    String player = text(created.body(), "id");
    var view = request("/api/game", null, player, null);
    assertEquals(200, view.status());
    assertEquals(player, text(view.body().path("user"), "id"));
    assertEquals(1, view.body().path("campaign").path("players").size());
    var deposit =
        post("/api/game", obj("type", "deposit", "resource", "gold", "amount", 10), player);
    assertEquals(200, deposit.status());
    String depositId = text(deposit.body().path("campaign").path("deposits").get(0), "id");
    assertEquals(
        200,
        post("/api/game", obj("type", "reviewDeposit", "id", depositId, "accept", true), gm)
            .status());
    assertEquals(
        "accepted",
        text(
            request("/api/game", null, player, null)
                .body()
                .path("campaign")
                .path("deposits")
                .get(0),
            "status"));
    assertEquals(2, request("/api/profiles", null, null, null).body().path("profiles").size());
    assertEquals(400, post("/api/accounts", obj("type", "reset", "userId", player), gm).status());
    assertEquals(410, post("/api/auth/sign-in/username", obj(), null).status());
    assertEquals(410, post("/api/auth/change-password", obj(), null).status());
    assertEquals(404, request("/api/game", null, "missing", null).status());
    assertEquals(
        403,
        request(
                "/api/game",
                obj("type", "legendary", "enabled", true),
                gm,
                "https://example.invalid")
            .status());
    assertTrue(
        db.read(c -> rows(c, "SELECT password FROM account")).stream()
            .allMatch(row -> row.get("password") == null));
    assertTrue(db.read(c -> rows(c, "SELECT * FROM java_sessions")).isEmpty());
    var reopened = new Database(FILE.toString());
    assertEquals(2, reopened.read(c -> rows(c, "SELECT * FROM memberships")).size());
  }
}
