package fr.royaumes;

import static fr.royaumes.Database.*;
import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class GameService {
  private final Database db;
  private final Campaigns campaigns;
  private final GameActions actions;
  private final Catalog catalog;

  public GameService(Database db, Campaigns campaigns, GameActions actions, Catalog catalog) {
    this.db = db;
    this.campaigns = campaigns;
    this.actions = actions;
    this.catalog = catalog;
  }

  private ObjectNode reply(ObjectNode state, AuthService.Identity user, String code) {
    var out =
        obj(
            "user",
            obj("id", user.id(), "name", user.name()),
            "campaign",
            campaigns.visibleTo(state, user.id()));
    if (text(state, "gm").equals(user.id())) out.put("code", code);
    return out;
  }

  public ObjectNode get(AuthService.Identity user, String invite) {
    return db.read(
        c -> {
          if (invite != null) {
            String code = invite.trim().toUpperCase(Locale.ROOT);
            require(code.matches("[A-F0-9]{16}"), "Code de campagne invalide.");
            var row = one(c, "SELECT state FROM campaigns WHERE code=?", code);
            if (row == null) throw new GameException(404, "Code de campagne introuvable.");
            var state =
                campaigns.settle(parse((String) row.get("state")), System.currentTimeMillis());
            return obj(
                "invite",
                obj(
                    "name",
                    state.get("name"),
                    "period",
                    state.get("period"),
                    "factions",
                    catalog.factionsAt(state.get("period"))));
          }
          var row =
              one(
                  c,
                  "SELECT c.* FROM campaigns c JOIN memberships m ON c.id=m.campaign_id WHERE"
                      + " m.user_id=?",
                  user.id());
          return row == null
              ? obj("user", obj("id", user.id(), "name", user.name()), "campaign", null)
              : reply(
                  campaigns.settle(parse((String) row.get("state")), System.currentTimeMillis()),
                  user,
                  (String) row.get("code"));
        });
  }

  public ObjectNode command(AuthService.Identity user, ObjectNode a) {
    ActionValidation.validate(a);
    return db.transaction(
        c -> {
          var member = one(c, "SELECT campaign_id FROM memberships WHERE user_id=?", user.id());
          String type = text(a, "type");
          long now = System.currentTimeMillis();
          if (type.equals("create")) {
            require(member == null, "Vous êtes déjà dans une campagne.");
            var s =
                campaigns.create(
                    user.id(),
                    a.path("playerName").asText(user.name()),
                    text(a, "faction"),
                    a.path("name").asText("La Guerre de l’Anneau").trim(),
                    a.path("era").asText("Troisième Âge · 3018"),
                    now);
            String id = id(),
                code = id().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT);
            update(c, "INSERT INTO campaigns VALUES(?,?,?,?,0)", id, user.id(), code, s.toString());
            update(c, "INSERT INTO memberships VALUES(?,?)", user.id(), id);
            return reply(s, user, code);
          }
          if (type.equals("join")) {
            require(member == null, "Vous êtes déjà dans une campagne.");
            var row =
                one(
                    c,
                    "SELECT * FROM campaigns WHERE code=?",
                    text(a, "code").trim().toUpperCase(Locale.ROOT));
            require(row != null, "Code de campagne introuvable.");
            var s = campaigns.settle(parse((String) row.get("state")), now);
            campaigns.addPlayer(
                s, user.id(), a.path("playerName").asText(user.name()), text(a, "faction"));
            update(
                c,
                "UPDATE campaigns SET state=?,revision=revision+1 WHERE id=?",
                s.toString(),
                row.get("id"));
            update(c, "INSERT INTO memberships VALUES(?,?)", user.id(), row.get("id"));
            return reply(s, user, (String) row.get("code"));
          }
          require(member != null, "Créez ou rejoignez une campagne.");
          var row = one(c, "SELECT * FROM campaigns WHERE id=?", member.get("campaign_id"));
          if (row == null) throw new GameException(404, "Campagne introuvable.");
          var s = actions.apply(parse((String) row.get("state")), user.id(), a, now);
          int updated =
              update(
                  c,
                  "UPDATE campaigns SET state=?,revision=revision+1 WHERE id=? AND revision=?",
                  s.toString(),
                  row.get("id"),
                  row.get("revision"));
          if (updated != 1) throw new GameException(409, "La campagne a changé. Réessayez.");
          return reply(s, user, (String) row.get("code"));
        });
  }
}
