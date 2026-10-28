package fr.royaumes;

import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class Catalog {
  public static final List<String> RES = List.of("gold", "wood", "stone", "iron", "food");
  public static final List<String> STATS =
      List.of("attack", "defense", "hp", "range", "speed", "morale");
  public final ObjectNode data, factions, buildings, doctrines;
  public final LinkedHashMap<String, ObjectNode> units = new LinkedHashMap<>();

  public Catalog() {
    try (var input = getClass().getResourceAsStream("/catalog.json")) {
      data = object(MAPPER.readTree(input));
    } catch (Exception e) {
      throw new IllegalStateException("Catalogue illisible", e);
    }
    factions = object(data.get("factions"));
    buildings = object(data.get("buildings"));
    doctrines = object(data.get("doctrines"));
    data.get("units").forEach(u -> units.put(text(u, "id"), object(u)));
  }

  public ObjectNode period(int age, int year) {
    require(
        age >= 1 && age <= 4 && year >= 1 && year <= data.path("ageLimits").path("" + age).asInt(),
        "Date de campagne invalide.");
    return obj("age", age, "year", year);
  }

  public ObjectNode parsePeriod(String era) {
    int age =
        era.contains("Premier")
            ? 1
            : era.contains("Deuxième") ? 2 : era.contains("Quatrième") ? 4 : 3;
    var match = java.util.regex.Pattern.compile("(\\d+)\\s*$").matcher(era);
    return period(age, match.find() ? Integer.parseInt(match.group(1)) : 3018);
  }

  public String periodLabel(JsonNode p) {
    return data.path("ageNames").path(p.path("age").asText()).asText()
        + " · "
        + p.path("year").asInt();
  }

  boolean inWindow(JsonNode windows, JsonNode period) {
    for (var w : windows)
      if (w.get(0).asInt() == period.path("age").asInt()
          && period.path("year").asInt() >= w.get(1).asInt()
          && period.path("year").asInt() <= w.get(2).asInt()) return true;
    return false;
  }

  public boolean factionAvailable(String f, JsonNode p) {
    return factions.has(f) && inWindow(factions.path(f).path("windows"), p);
  }

  public List<String> factionsAt(JsonNode p) {
    var out = new ArrayList<String>();
    factions
        .fieldNames()
        .forEachRemaining(
            f -> {
              if (factionAvailable(f, p)) out.add(f);
            });
    return out;
  }

  public boolean unitAvailable(JsonNode u, String f, JsonNode p) {
    if (u == null || u.path("eventOnly").asBoolean() || !factionAvailable(f, p)) return false;
    boolean belongs = false;
    for (var faction : u.path("factions")) if (faction.asText().equals(f)) belongs = true;
    return belongs && (!u.has("windows") || inWindow(u.get("windows"), p));
  }

  public boolean eventAvailable(JsonNode u, JsonNode p) {
    return u != null
        && u.path("eventOnly").asBoolean()
        && u.has("windows")
        && inWindow(u.get("windows"), p);
  }

  public ObjectNode doctrine(String f, JsonNode balance) {
    var d = doctrines.path(f).deepCopy();
    require(d.isObject(), "Faction inconnue.");
    if (balance.path("factions").path(f).isObject())
      object(d).setAll(object(balance.path("factions").path(f)));
    return object(d);
  }

  public ObjectNode unit(String id, String faction, JsonNode balance) {
    require(units.containsKey(id), "Unité inconnue.");
    var u = units.get(id).deepCopy();
    var override = balance.path("units").path(id);
    if (override.isObject()) {
      u.setAll(object(override.path("stats")));
      u.set("cost", override.path("cost").deepCopy());
    }
    if (faction == null
        || id.equals("legacy")
        || u.path("legendary").asBoolean()
        || u.path("eventOnly").asBoolean()) return u;
    var d = doctrine(faction, balance);
    var upkeep = object(u.get("upkeep"));
    upkeep.put(
        "food",
        Math.round(
                upkeep.path("food").asDouble() * (1 + d.path("upkeepFood").asDouble() / 100) * 100)
            / 100.0);
    if (text(u, "kind").equals(text(d, "specialty"))) {
      var cost = object(u.get("cost"));
      cost.put(
          "gold",
          Math.ceil(cost.path("gold").asDouble() * (1 + d.path("recruitGold").asDouble() / 100)));
      d.path("stats")
          .fields()
          .forEachRemaining(
              e -> {
                double v =
                    Math.max(
                        1,
                        Math.round(
                                u.path(e.getKey()).asDouble()
                                    * (1 + e.getValue().asDouble() / 100)
                                    * 100)
                            / 100.0);
                u.put(e.getKey(), e.getKey().equals("morale") ? Math.min(100, v) : v);
              });
    }
    return u;
  }
}
