package fr.royaumes;

import static fr.royaumes.ActionValidation.integer;
import static fr.royaumes.Campaigns.*;
import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.stereotype.Service;

@Service
public class GameActions {
  private final Catalog catalog;
  private final Economy economy;
  private final Campaigns campaigns;

  public GameActions(Catalog catalog, Economy economy, Campaigns campaigns) {
    this.catalog = catalog;
    this.economy = economy;
    this.campaigns = campaigns;
  }

  private ObjectNode find(JsonNode list, String id) {
    for (var item : list) if (text(item, "id").equals(id)) return object(item);
    return null;
  }

  private ObjectNode own(ObjectNode city, String user) {
    require(
        city != null && text(city, "owner").equals(user), "Cette ville ne vous appartient pas.");
    return city;
  }

  private void gm(ObjectNode s, String user) {
    require(text(s, "gm").equals(user), "Action réservée au game master.");
  }

  public int unitCount(ObjectNode s, String unit) {
    int n = 0;
    for (var c : s.path("cities")) n += c.path("troops").path(unit).asInt();
    for (var o : s.path("orders"))
      if (text(o, "unit").equals(unit) && text(o, "status").equals("pending"))
        n += o.path("count").asInt();
    return n;
  }

  public ObjectNode apply(ObjectNode s, String user, ObjectNode a, long now) {
    ActionValidation.validate(a);
    campaigns.settle(s, now);
    var p = s.path("players").path(user);
    require(p.isObject(), "Vous ne faites pas partie de cette campagne.");
    var city = find(s.path("cities"), text(a, "city"));
    var balance = s.path("balance");
    var wallet = object(p.get("wallet"));
    String type = text(a, "type"), faction = text(p, "faction");
    switch (type) {
      case "balanceBuilding", "balanceUnit", "balanceFaction" -> {
        gm(s, user);
        int revision = a.path("revision").asInt();
        require(
            balance.path("revision").asInt() == revision,
            "Les réglages ont changé. Rechargez les valeurs avant de sauvegarder.");
        String id = text(a, "id"),
            group =
                type.equals("balanceBuilding")
                    ? "buildings"
                    : type.equals("balanceUnit") ? "units" : "factions";
        JsonNode target =
            group.equals("buildings")
                ? catalog.buildings.get(id)
                : group.equals("units") ? catalog.units.get(id) : catalog.factions.get(id);
        require(target != null, "Réglage inconnu.");
        var root = ensure(s, "balance");
        var entries = ensure(root, group);
        if (a.get("value").isNull()) entries.remove(id);
        else entries.set(id, a.get("value").deepCopy());
        root.put("revision", revision + 1);
        log(
            s,
            "Le GM "
                + (a.get("value").isNull() ? "rétablit" : "modifie")
                + " les réglages de "
                + text(target, "name")
                + ".",
            now,
            "public");
      }
      case "upgrade" -> {
        var c = own(city, user);
        String b = text(a, "building");
        require(catalog.buildings.has(b), "Bâtiment inconnu.");
        int level = campaigns.plannedLevel(c, b);
        require(level < 40, "Niveau maximum atteint ou déjà programmé.");
        require(
            !c.path("build").isObject() || c.path("queue").size() < 20,
            "File pleine : 20 améliorations en attente maximum.");
        var paid = economy.upgradeCost(level, b, balance);
        long duration = economy.constructionMillis(level, b, balance);
        Economy.pay(wallet, paid);
        if (c.path("build").isObject())
          list(c, "queue")
              .add(
                  obj(
                      "id",
                      id(),
                      "type",
                      b,
                      "level",
                      level + 1,
                      "paid",
                      paid,
                      "duration",
                      duration));
        else c.set("build", obj("type", b, "start", now, "end", now + duration));
        log(
            s,
            text(c, "name")
                + " : "
                + text(catalog.buildings.path(b), "name")
                + " niveau "
                + (level + 1)
                + " programmé.",
            now,
            user);
      }
      case "cancelQueuedBuild" -> {
        var c = own(city, user);
        var queue = list(c, "queue");
        var job = queue.isEmpty() ? null : queue.get(queue.size() - 1);
        require(
            job != null && text(job, "id").equals(text(a, "id")),
            "Seule la dernière amélioration en attente peut être annulée.");
        queue.remove(queue.size() - 1);
        Economy.add(wallet, job.get("paid"), 1);
        log(
            s,
            text(c, "name")
                + " : "
                + text(catalog.buildings.path(text(job, "type")), "name")
                + " niveau "
                + job.path("level").asInt()
                + " annulé et remboursé.",
            now,
            user);
      }
      case "recruit" -> {
        var c = own(city, user);
        var u = catalog.units.get(text(a, "unit"));
        require(
            catalog.unitAvailable(u, faction, s.path("period")),
            "Unité indisponible pour cette faction et cette époque.");
        require(
            !u.path("legendary").asBoolean() || s.path("rules").path("legendary").asBoolean(),
            "Le GM doit autoriser les unités légendaires.");
        int n = integer(a.path("count"), 1, 1000),
            level = c.path("levels").path("barracks").asInt();
        require(
            level >= u.path("level").asInt(),
            "Caserne niveau " + u.path("level").asInt() + " nécessaire.");
        require(n * u.path("slots").asInt() <= level * 25, "Capacité de la caserne dépassée.");
        require(
            !u.has("limit") || unitCount(s, text(u, "id")) + n <= u.path("limit").asInt(),
            "Limite de campagne atteinte.");
        var paid = economy.recruitmentCost(text(u, "id"), n, faction, balance);
        Economy.pay(wallet, paid);
        list(s, "orders")
            .insert(
                0,
                obj(
                    "id",
                    id(),
                    "owner",
                    user,
                    "city",
                    text(c, "id"),
                    "unit",
                    text(u, "id"),
                    "count",
                    n,
                    "paid",
                    paid,
                    "status",
                    "pending",
                    "at",
                    now));
        log(
            s,
            text(p, "name")
                + " commande "
                + n
                + " × "
                + text(u, "name")
                + " pour "
                + text(c, "name")
                + ".",
            now,
            user);
      }
      case "deliver", "rejectOrder" -> {
        gm(s, user);
        var order = find(s.path("orders"), text(a, "id"));
        require(
            order != null && text(order, "status").equals("pending"),
            "Commande déjà traitée ou introuvable.");
        var u = catalog.units.get(text(order, "unit"));
        String owner = text(order, "owner");
        if (type.equals("deliver")) {
          require(
              !u.path("legendary").asBoolean() || s.path("rules").path("legendary").asBoolean(),
              "Les unités légendaires sont désactivées.");
          var c = find(s.path("cities"), text(order, "city"));
          require(c != null, "Ville introuvable.");
          var troops = ensure(c, "troops");
          String unit = text(u, "id");
          troops.put(unit, troops.path(unit).asInt() + order.path("count").asInt());
          c.put("army", troopCount(c));
          order.put("status", "delivered");
          log(
              s,
              "Le GM livre "
                  + order.path("count").asInt()
                  + " × "
                  + text(u, "name")
                  + " à "
                  + text(c, "name")
                  + ".",
              now,
              owner);
        } else {
          order.put("status", "rejected");
          Economy.add(object(s.path("players").path(owner).get("wallet")), order.get("paid"), 1);
          log(s, "Commande de " + text(u, "name") + " refusée et remboursée.", now, owner);
        }
      }
      case "loss", "transfer" -> {
        if (type.equals("loss")) {
          gm(s, user);
          require(city != null, "Ville introuvable.");
        } else own(city, user);
        String unit = text(a, "unit");
        var u = catalog.units.get(unit);
        require(u != null, "Unité inconnue.");
        var troops = ensure(city, "troops");
        int n = integer(a.path("count"), 1, troops.path(unit).asInt());
        ObjectNode to = null;
        if (type.equals("transfer")) {
          to = find(s.path("cities"), text(a, "to"));
          require(
              to != null
                  && text(to, "owner").equals(user)
                  && !text(to, "id").equals(text(city, "id")),
              "Destination invalide.");
        }
        int remaining = troops.path(unit).asInt() - n;
        if (remaining == 0) troops.remove(unit);
        else troops.put(unit, remaining);
        city.put("army", troopCount(city));
        if (to != null) {
          var dest = ensure(to, "troops");
          dest.put(unit, dest.path(unit).asInt() + n);
          to.put("army", troopCount(to));
          log(
              s,
              n
                  + " × "
                  + text(u, "name")
                  + " réaffectés de "
                  + text(city, "name")
                  + " à "
                  + text(to, "name")
                  + ". Registre uniquement : déplacement en jeu à coordonner avec le GM.",
              now,
              user);
        } else
          log(
              s,
              text(city, "name") + " : " + n + " × " + text(u, "name") + " perdus.",
              now,
              text(city, "owner"));
      }
      case "legendary" -> {
        gm(s, user);
        ensure(s, "rules").put("legendary", a.path("enabled").asBoolean());
        log(
            s,
            "Le GM "
                + (a.path("enabled").asBoolean() ? "autorise" : "désactive")
                + " les nouvelles unités légendaires.",
            now,
            "public");
      }
      case "encounter" -> {
        gm(s, user);
        var u = catalog.units.get(text(a, "unit"));
        require(
            s.path("rules").path("legendary").asBoolean()
                && catalog.eventAvailable(u, s.path("period")),
            "Rencontre indisponible à cette époque ou légendes désactivées.");
        for (var e : s.path("encounters"))
          require(
              !text(e, "unit").equals(text(u, "id")),
              "Cette rencontre unique existe déjà, même si elle a été vaincue.");
        String location = a.has("location") ? text(a, "location").trim() : "Moria";
        list(s, "encounters")
            .add(
                obj(
                    "id",
                    id(),
                    "unit",
                    text(u, "id"),
                    "name",
                    text(u, "name"),
                    "location",
                    location,
                    "status",
                    "active",
                    "at",
                    now));
        log(s, "Rencontre indépendante : " + text(u, "name") + ", " + location + ".", now, user);
      }
      case "defeatEncounter" -> {
        gm(s, user);
        var e = find(s.path("encounters"), text(a, "id"));
        require(e != null && text(e, "status").equals("active"), "Rencontre déjà terminée.");
        e.put("status", "defeated");
        log(s, text(e, "name") + " a été vaincu, selon le GM.", now, user);
      }
      case "period" -> {
        gm(s, user);
        var period = catalog.period(a.path("age").asInt(), a.path("year").asInt());
        for (var player : s.path("players"))
          require(
              catalog.factionAvailable(text(player, "faction"), period),
              "Une faction de la campagne est incompatible avec cette date.");
        for (var o : s.path("orders"))
          if (text(o, "status").equals("pending") && !text(o, "unit").equals("legacy"))
            require(
                catalog.unitAvailable(
                    catalog.units.get(text(o, "unit")),
                    text(s.path("players").path(text(o, "owner")), "faction"),
                    period),
                "Traitez les commandes incompatibles avant de changer de date.");
        s.set("period", period);
        s.put("era", catalog.periodLabel(period));
        log(
            s,
            "Date de campagne fixée à "
                + text(s, "era")
                + ". Les troupes existantes sont conservées.",
            now,
            "public");
      }
      case "deposit" -> {
        String resource = text(a, "resource");
        int n = a.path("amount").asInt();
        list(s, "deposits")
            .insert(
                0,
                obj(
                    "id",
                    id(),
                    "owner",
                    user,
                    "resource",
                    resource,
                    "amount",
                    n,
                    "status",
                    "pending",
                    "at",
                    now));
        String label =
            switch (resource) {
              case "gold" -> "mirians";
              case "wood" -> "bois";
              case "stone" -> "pierre";
              case "iron" -> "fer";
              default -> "nourriture";
            };
        log(s, text(p, "name") + " déclare " + n + " " + label + ".", now, user);
      }
      case "reviewDeposit" -> {
        gm(s, user);
        var d = find(s.path("deposits"), text(a, "id"));
        require(
            d != null && text(d, "status").equals("pending"), "Dépôt déjà traité ou introuvable.");
        boolean accepted = a.path("accept").asBoolean();
        d.put("status", accepted ? "accepted" : "rejected");
        var player = s.path("players").path(text(d, "owner"));
        if (accepted) {
          var w = object(player.get("wallet"));
          String k = text(d, "resource");
          w.put(k, w.path(k).asDouble() + d.path("amount").asDouble());
        }
        log(
            s,
            "Dépôt de " + text(player, "name") + " " + (accepted ? "validé" : "refusé") + ".",
            now,
            text(d, "owner"));
      }
      case "found" -> {
        int count = 0;
        for (var c : s.path("cities")) if (text(c, "owner").equals(user)) count++;
        require(count < 12, "Limite de 12 villes atteinte.");
        String name = text(a, "name").trim();
        Economy.pay(wallet, obj("gold", 1500, "wood", 800, "stone", 600, "iron", 100, "food", 300));
        var levels = obj();
        catalog.buildings.fieldNames().forEachRemaining(b -> levels.put(b, 1));
        list(s, "cities")
            .add(
                obj(
                    "id", id(), "name", name, "owner", user, "army", 0, "troops", obj(), "levels",
                    levels, "build", null));
        log(s, text(p, "name") + " fonde " + name + ".", now, user);
      }
      default -> throw new GameException("Action inconnue.");
    }
    return s;
  }
}
