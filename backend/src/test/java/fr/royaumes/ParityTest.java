package fr.royaumes;

import static fr.royaumes.Json.*;
import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;

class ParityTest {
  final Catalog catalog = new Catalog();
  final Economy economy = new Economy(catalog);
  final Campaigns campaigns = new Campaigns(catalog, economy);
  final GameActions actions = new GameActions(catalog, economy, campaigns);

  @TestFactory
  Stream<DynamicTest> sameResultsAsTypeScript() throws Exception {
    var cases = MAPPER.readTree(getClass().getResourceAsStream("/parity.json"));
    var tests = new ArrayList<DynamicTest>();
    int i = 0;
    for (var fixture : cases) {
      int index = i++;
      tests.add(
          DynamicTest.dynamicTest(
              index
                  + " "
                  + text(fixture, "kind")
                  + " "
                  + text(fixture, "faction")
                  + " "
                  + text(fixture, "id"),
              () -> {
                var f = object(fixture);
                JsonNode actual;
                switch (text(f, "kind")) {
                  case "create" ->
                      actual =
                          campaigns.create(
                              "gm",
                              "GM",
                              text(f, "faction"),
                              "Parité",
                              text(f, "era"),
                              1700000000000L);
                  case "rates" -> {
                    var s = object(f.get("state")).deepCopy();
                    var cities = list(s, "cities");
                    while (cities.size() > 1) cities.remove(cities.size() - 1);
                    actual = economy.rates(s, "gm");
                  }
                  case "cost" -> {
                    actual =
                        economy.upgradeCost(f.path("level").asInt(), text(f, "building"), obj());
                    assertEquals(
                        f.path("duration").asLong(),
                        economy.constructionMillis(
                            f.path("level").asInt(), text(f, "building"), obj()));
                  }
                  case "unit" ->
                      actual = catalog.unit(text(f, "id"), text(f, "faction"), f.path("balance"));
                  case "action" ->
                      actual =
                          actions.apply(
                              object(f.get("state")).deepCopy(),
                              text(f, "user"),
                              object(f.get("action")),
                              f.path("now").asLong());
                  case "settle" ->
                      actual =
                          campaigns.settle(
                              object(f.get("state")).deepCopy(), f.path("now").asLong());
                  case "invalid" -> {
                    assertThrows(
                        GameException.class,
                        () ->
                            actions.apply(
                                object(f.get("state")).deepCopy(),
                                text(f, "user"),
                                object(f.get("action")),
                                f.path("now").asLong()));
                    return;
                  }
                  default -> throw new AssertionError("Fixture inconnue");
                }
                compare(f.get("expected"), actual, "");
              }));
    }
    return tests.stream();
  }

  static void compare(JsonNode expected, JsonNode actual, String path) {
    assertNotNull(actual, path);
    if (expected.isNumber()) {
      assertTrue(actual.isNumber(), path);
      assertEquals(expected.asDouble(), actual.asDouble(), 1e-7, path);
      return;
    }
    if (expected.isTextual()
        && expected.asText().matches("[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}")) {
      assertTrue(actual.asText().matches("[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}"), path);
      return;
    }
    if (expected.isObject()) {
      assertEquals(expected.size(), actual.size(), path + " keys");
      var fields = expected.fields();
      while (fields.hasNext()) {
        var e = fields.next();
        compare(e.getValue(), actual.get(e.getKey()), path + "/" + e.getKey());
      }
      return;
    }
    if (expected.isArray()) {
      assertEquals(expected.size(), actual.size(), path + " length");
      for (int j = 0; j < expected.size(); j++)
        compare(expected.get(j), actual.get(j), path + "/" + j);
      return;
    }
    assertEquals(expected, actual, path);
  }

  @Test
  void verifiesLegacyScryptWithoutRehashing() throws Exception {
    var fixture = MAPPER.readTree(getClass().getResourceAsStream("/scrypt.json"));
    var passwords = new Passwords();
    assertTrue(passwords.verify(text(fixture, "hash"), text(fixture, "password")));
    assertFalse(passwords.verify(text(fixture, "hash"), "wrong"));
  }

  @Test
  void playerProjectionDoesNotLeakOtherRealms() {
    var s = campaigns.create("gm", "GM", "gondor", "Test", "Troisième Âge · 3018", 0);
    campaigns.addPlayer(s, "player", "Joueur", "rohan");
    var visible = campaigns.visibleTo(s, "player");
    assertEquals(1, visible.path("players").size());
    assertEquals("", text(visible, "gm"));
    assertEquals(0, visible.path("encounters").size());
    for (var c : visible.path("cities")) assertEquals("player", text(c, "owner"));
  }
}
