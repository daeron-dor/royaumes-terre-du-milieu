package fr.royaumes;

import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;

/** Reject invalid input before any mutation; mirrors the public JSON action contract. */
public final class ActionValidation {
  private ActionValidation() {}

  public static int integer(JsonNode value, int min, int max) {
    require(
        value.isNumber()
            && Double.isFinite(value.asDouble())
            && value.asDouble() == Math.floor(value.asDouble())
            && value.asDouble() >= min
            && value.asDouble() <= max,
        "Quantité invalide.");
    return value.asInt();
  }

  public static String string(JsonNode a, String key, int min, int max) {
    var v = a.path(key);
    require(
        v.isTextual() && v.asText().trim().length() >= min && v.asText().trim().length() <= max,
        "Champ invalide : " + key);
    return v.asText().trim();
  }

  static void bool(JsonNode a, String k) {
    require(a.path(k).isBoolean(), "Réglage invalide.");
  }

  public static void validate(ObjectNode a) {
    String type = string(a, "type", 1, 60);
    switch (type) {
      case "balanceBuilding", "balanceUnit", "balanceFaction" -> {
        string(a, "id", 1, 100);
        integer(a.path("revision"), 0, Integer.MAX_VALUE);
        require(a.has("value"), "Valeur manquante.");
        if (!a.get("value").isNull()) balance(type, a.get("value"));
      }
      case "upgrade" -> {
        string(a, "city", 1, 100);
        string(a, "building", 1, 30);
      }
      case "cancelQueuedBuild" -> {
        string(a, "city", 1, 100);
        string(a, "id", 1, 100);
      }
      case "recruit", "loss", "transfer" -> {
        string(a, "city", 1, 100);
        string(a, "unit", 1, 100);
        integer(a.path("count"), 1, 100000);
        if (type.equals("transfer")) string(a, "to", 1, 100);
      }
      case "deliver", "rejectOrder", "defeatEncounter" -> string(a, "id", 1, 100);
      case "legendary" -> bool(a, "enabled");
      case "encounter" -> {
        string(a, "unit", 1, 100);
        if (a.has("location")) string(a, "location", 1, 70);
      }
      case "period" -> {
        integer(a.path("age"), 1, 4);
        integer(a.path("year"), 1, Integer.MAX_VALUE);
      }
      case "deposit" -> {
        require(Catalog.RES.contains(string(a, "resource", 1, 20)), "Ressource inconnue.");
        integer(a.path("amount"), 1, 100000);
      }
      case "reviewDeposit" -> {
        string(a, "id", 1, 100);
        bool(a, "accept");
      }
      case "found" -> string(a, "name", 2, 40);
      case "create", "join" -> {
        string(a, "faction", 1, 60);
        if (a.has("playerName")) string(a, "playerName", 1, 40);
        if (type.equals("join"))
          require(string(a, "code", 16, 16).matches("[a-fA-F0-9]{16}"), "Code invalide.");
        else {
          if (a.has("name")) string(a, "name", 1, 70);
          if (a.has("era")) string(a, "era", 0, 70);
        }
      }
      default -> throw new GameException("Action inconnue.");
    }
  }

  private static void keys(JsonNode value, List<String> expected) {
    require(
        value.isObject()
            && value.size() == expected.size()
            && expected.stream().allMatch(value::has),
        "Champs de réglage invalides.");
  }

  private static void numbers(
      JsonNode value, List<String> keys, int min, int max, boolean integral) {
    keys(value, keys);
    for (var k : keys) {
      var n = value.path(k);
      require(
          n.isNumber()
              && Double.isFinite(n.asDouble())
              && n.asDouble() >= min
              && n.asDouble() <= max
              && (!integral || n.asDouble() == Math.floor(n.asDouble())),
          "Valeur de réglage hors limites.");
    }
  }

  private static void balance(String type, JsonNode v) {
    if (type.equals("balanceFaction")) {
      keys(v, List.of("production", "stats", "recruitGold", "upkeepFood"));
      numbers(v.path("production"), Catalog.RES, -90, 200, true);
      numbers(v.path("stats"), Catalog.STATS, -90, 200, true);
      integer(v.path("recruitGold"), -90, 200);
      integer(v.path("upkeepFood"), -90, 200);
    } else {
      keys(
          v,
          type.equals("balanceBuilding")
              ? List.of("cost", "timePercent")
              : List.of("cost", "stats"));
      numbers(v.path("cost"), Catalog.RES, 0, 1000000, true);
      if (type.equals("balanceBuilding")) integer(v.path("timePercent"), 10, 1000);
      else {
        numbers(v.path("stats"), Catalog.STATS, 0, 10000, false);
        require(
            v.path("stats").path("hp").asDouble() >= 1
                && v.path("stats").path("morale").asDouble() <= 100,
            "Statistiques hors limites.");
      }
    }
  }
}
