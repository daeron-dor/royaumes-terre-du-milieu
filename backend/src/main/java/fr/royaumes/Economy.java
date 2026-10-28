package fr.royaumes;

import static fr.royaumes.Catalog.RES;
import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

@Service
public class Economy {
  private final Catalog catalog;

  public Economy(Catalog catalog) {
    this.catalog = catalog;
  }

  public static ObjectNode wallet() {
    return obj("gold", 0, "wood", 0, "stone", 0, "iron", 0, "food", 0);
  }

  public static void add(ObjectNode wallet, JsonNode amount, double factor) {
    RES.forEach(k -> wallet.put(k, wallet.path(k).asDouble() + amount.path(k).asDouble() * factor));
  }

  public static void pay(ObjectNode wallet, JsonNode cost) {
    for (var k : RES)
      require(wallet.path(k).asDouble() >= cost.path(k).asDouble(), "Ressources insuffisantes.");
    add(wallet, cost, -1);
  }

  public ObjectNode upgradeCost(int level, String building, JsonNode balance) {
    double factor = level * (1 + Math.max(0, level - 5) / 20.0),
        base = catalog.buildings.path(building).path("cost").asDouble();
    var custom = balance.path("buildings").path(building).path("cost");
    var result = wallet();
    if (custom.isObject())
      RES.forEach(k -> result.put(k, Math.round(custom.path(k).asDouble() * factor)));
    else {
      result.put("gold", Math.round(base * factor));
      result.put("wood", Math.round(base * .65 * factor));
      result.put("stone", Math.round(base * .5 * factor));
      result.put(
          "iron",
          building.equals("barracks") || building.equals("walls") ? Math.round(50 * factor) : 0);
    }
    return result;
  }

  public long constructionMillis(int level, String building, JsonNode balance) {
    double minutes =
        Math.max(
            .1,
            Math.round(
                    Math.round(1 + .55 * (level - 1) + .015 * Math.pow(Math.max(0, level - 5), 2))
                        * balance
                            .path("buildings")
                            .path(building)
                            .path("timePercent")
                            .asDouble(100))
                / 100.0);
    return Math.round(minutes * 60000);
  }

  public ObjectNode recruitmentCost(String unit, int count, String faction, JsonNode balance) {
    var cost = object(catalog.unit(unit, faction, balance).get("cost"));
    RES.forEach(k -> cost.put(k, cost.path(k).asDouble() * count));
    return cost;
  }

  public ObjectNode rates(ObjectNode state, String owner) {
    var rate = wallet();
    String faction = text(state.path("players").path(owner), "faction");
    var balance = state.path("balance");
    var doctrine = catalog.doctrine(faction, balance);
    for (var city : state.path("cities"))
      if (text(city, "owner").equals(owner)) {
        catalog
            .buildings
            .fields()
            .forEachRemaining(
                e -> {
                  var b = e.getValue();
                  if (b.path("resource").isTextual()) {
                    String k = text(b, "resource");
                    rate.put(
                        k,
                        rate.path(k).asDouble()
                            + b.path("rate").asDouble()
                                * city.path("levels").path(e.getKey()).asDouble()
                                * (1 + doctrine.path("production").path(k).asDouble() / 100));
                  }
                });
        city.path("troops")
            .fields()
            .forEachRemaining(
                e -> {
                  String id = catalog.units.containsKey(e.getKey()) ? e.getKey() : "legacy";
                  var u = catalog.unit(id, faction, balance);
                  for (var k : new String[] {"gold", "food"})
                    rate.put(
                        k,
                        rate.path(k).asDouble()
                            - u.path("upkeep").path(k).asDouble() * e.getValue().asDouble());
                });
      }
    return rate;
  }
}
