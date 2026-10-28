package fr.royaumes;

import static fr.royaumes.Catalog.RES;
import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class Campaigns {
  final Catalog catalog;
  final Economy economy;

  public Campaigns(Catalog catalog, Economy economy) {
    this.catalog = catalog;
    this.economy = economy;
  }

  public static int troopCount(JsonNode city) {
    int count = 0;
    for (var n : city.path("troops")) count += n.asInt();
    return count;
  }

  public static void log(ObjectNode state, String text, long at, String audience) {
    var logs = list(state, "logs");
    logs.insert(0, obj("text", text, "at", at, "audience", audience));
    while (logs.size() > 200) logs.remove(logs.size() - 1);
  }

  public ObjectNode normalize(ObjectNode s) {
    if (!s.hasNonNull("period")) s.set("period", catalog.parsePeriod(text(s, "era")));
    if (!s.hasNonNull("rules")) s.set("rules", obj("legendary", false));
    list(s, "encounters");
    for (var c : objects(s.path("cities"))) {
      list(c, "queue");
      if (!c.hasNonNull("troops"))
        c.set("troops", c.path("army").asInt() > 0 ? obj("legacy", c.path("army").asInt()) : obj());
      c.put("army", troopCount(c));
    }
    for (var o : objects(s.path("orders"))) {
      if (!o.hasNonNull("unit")) o.put("unit", "legacy");
      if (!o.hasNonNull("paid")) {
        int n = o.path("count").asInt();
        o.set("paid", obj("gold", n * 25, "wood", 0, "stone", 0, "iron", n * 8, "food", n * 10));
      }
    }
    s.put("version", 2);
    return s;
  }

  public ObjectNode settle(ObjectNode s, long now) {
    normalize(s);
    long cursor = s.path("last").asLong(), end = Math.max(cursor, now);
    complete(s, cursor);
    while (cursor < end) {
      long next = end;
      for (var c : s.path("cities")) {
        long due = c.path("build").path("end").asLong(Long.MAX_VALUE);
        if (due > cursor && due <= end) next = Math.min(next, due);
      }
      for (var p : objects(s.path("players"))) {
        var rate = economy.rates(s, text(p, "id"));
        var wallet = object(p.get("wallet"));
        for (var k : RES)
          wallet.put(
              k,
              Math.max(
                  0,
                  Math.min(
                      1e7,
                      wallet.path(k).asDouble()
                          + rate.path(k).asDouble() * (next - cursor) / 3600000)));
      }
      cursor = next;
      complete(s, cursor);
    }
    s.put("last", end);
    return s;
  }

  private void complete(ObjectNode s, long at) {
    for (var c : objects(s.path("cities")))
      while (c.path("build").isObject() && c.path("build").path("end").asLong() <= at) {
        long finished = c.path("build").path("end").asLong();
        String b = text(c.get("build"), "type");
        var levels = object(c.get("levels"));
        levels.put(b, Math.min(40, levels.path(b).asInt() + 1));
        log(
            s,
            text(c, "name")
                + " : "
                + text(catalog.buildings.path(b), "name")
                + " atteint le niveau "
                + levels.path(b).asInt()
                + ".",
            finished,
            text(c, "owner"));
        var queue = list(c, "queue");
        if (queue.isEmpty()) c.putNull("build");
        else {
          var job = queue.remove(0);
          c.set(
              "build",
              obj(
                  "type",
                  text(job, "type"),
                  "start",
                  finished,
                  "end",
                  finished + job.path("duration").asLong()));
        }
      }
  }

  public int plannedLevel(JsonNode city, String b) {
    int level =
        city.path("levels").path(b).asInt() + (text(city.path("build"), "type").equals(b) ? 1 : 0);
    for (var j : city.path("queue")) if (text(j, "type").equals(b)) level++;
    return level;
  }

  public ObjectNode create(
      String user, String name, String faction, String campaign, String era, long now) {
    var period = catalog.parsePeriod(era);
    var s =
        obj(
            "version",
            2,
            "name",
            campaign,
            "era",
            catalog.periodLabel(period),
            "period",
            period,
            "rules",
            obj("legendary", false),
            "gm",
            user,
            "players",
            obj(),
            "cities",
            array(),
            "orders",
            array(),
            "deposits",
            array(),
            "encounters",
            array(),
            "logs",
            array(),
            "last",
            now);
    addPlayer(s, user, name, faction);
    return s;
  }

  public void addPlayer(ObjectNode s, String user, String name, String faction) {
    require(
        catalog.factionAvailable(faction, s.path("period")),
        "Cette faction n’existe pas à la date de la campagne.");
    var players = ensure(s, "players");
    require(!players.has(user), "Ce joueur participe déjà à cette campagne.");
    for (var p : players)
      require(!text(p, "faction").equals(faction), "Cette faction est déjà occupée.");
    String display = name.trim();
    if (display.isEmpty()) display = "Seigneur";
    if (display.length() > 40) display = display.substring(0, 40);
    players.set(
        user,
        obj(
            "id",
            user,
            "name",
            display,
            "faction",
            faction,
            "wallet",
            obj("gold", 2400, "wood", 1400, "stone", 1200, "iron", 650, "food", 1800)));
    String starter = "legacy";
    for (var u : catalog.units.values())
      if (catalog.unitAvailable(u, faction, s.path("period"))
          && u.path("level").asInt() == 1
          && !u.path("legendary").asBoolean()) {
        starter = text(u, "id");
        break;
      }
    var cost = catalog.unit(starter, faction, s.path("balance")).path("cost");
    var budget = obj("gold", 360, "wood", 120, "stone", 0, "iron", 120, "food", 144);
    int count = 25;
    for (var k : RES)
      if (cost.path(k).asDouble() > 0)
        count =
            Math.min(count, (int) Math.floor(budget.path(k).asDouble() / cost.path(k).asDouble()));
    int i = 0;
    for (var cityName : catalog.factions.path(faction).path("cities")) {
      String n = cityName.asText();
      if (i == 0
          && faction.equals("gondor")
          && (s.path("period").path("age").asInt() == 2
              || (s.path("period").path("age").asInt() == 3
                  && s.path("period").path("year").asInt() < 2002))) n = "Minas Anor";
      var levels = obj();
      catalog.buildings.fieldNames().forEachRemaining(b -> levels.put(b, 1));
      levels.put("keep", i == 0 ? 3 : 1);
      levels.put("farm", 2);
      list(s, "cities")
          .add(
              obj(
                  "id",
                  id(),
                  "name",
                  n,
                  "owner",
                  user,
                  "army",
                  i == 0 ? count : 0,
                  "troops",
                  i == 0 ? obj(starter, count) : obj(),
                  "levels",
                  levels,
                  "build",
                  null));
      i++;
    }
    log(
        s,
        display + " rejoint " + text(catalog.factions.path(faction), "name") + ".",
        s.path("last").asLong(),
        user);
  }

  public ObjectNode visibleTo(ObjectNode s, String user) {
    require(s.path("players").has(user), "Vous ne faites pas partie de cette campagne.");
    if (text(s, "gm").equals(user)) return s.deepCopy();
    var out =
        obj(
            "version",
            s.get("version"),
            "name",
            s.get("name"),
            "era",
            s.get("era"),
            "period",
            s.get("period"),
            "rules",
            s.get("rules"),
            "gm",
            "",
            "players",
            obj(user, s.path("players").path(user)),
            "encounters",
            array(),
            "last",
            s.get("last"));
    if (s.has("balance")) out.set("balance", s.get("balance").deepCopy());
    for (var key : List.of("cities", "orders", "deposits")) {
      var a = array();
      s.path(key)
          .forEach(
              n -> {
                if (text(n, "owner").equals(user)) a.add(n.deepCopy());
              });
      out.set(key, a);
    }
    var logs = array();
    s.path("logs")
        .forEach(
            n -> {
              if (text(n, "audience").equals(user) || text(n, "audience").equals("public"))
                logs.add(n.deepCopy());
            });
    out.set("logs", logs);
    return out;
  }
}
