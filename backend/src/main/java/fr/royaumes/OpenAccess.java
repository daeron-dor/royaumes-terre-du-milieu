package fr.royaumes;

import static fr.royaumes.Database.*;
import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

/** Public profile selection, deliberately NOT authentication. All profiles are accessible. */
@Service
public class OpenAccess {
  private final Database db;
  private final Campaigns campaigns;

  public OpenAccess(Database db, Campaigns campaigns) {
    this.db = db;
    this.campaigns = campaigns;
  }

  public ObjectNode profiles() {
    return db.transaction(
        c -> {
          if (one(c, "SELECT id FROM campaigns LIMIT 1") == null) {
            String user = id(), campaign = id();
            long now = System.currentTimeMillis();
            AccountService.insert(c, user, "gm_" + user.substring(0, 8), null, now);
            var state =
                campaigns.create(
                    user, "Game Master", "gondor", "Les Royaumes", "Troisième Âge · 3018", now);
            update(
                c,
                "INSERT INTO campaigns VALUES(?,?,?,?,0)",
                campaign,
                user,
                id().replace("-", "").substring(0, 16).toUpperCase(java.util.Locale.ROOT),
                state.toString());
            update(c, "INSERT INTO memberships VALUES(?,?)", user, campaign);
          }
          var profiles = array();
          for (var row :
              rows(
                  c,
                  "SELECT u.id,u.name,c.id campaign_id,c.owner,c.state FROM user u JOIN memberships"
                      + " m ON m.user_id=u.id JOIN campaigns c ON c.id=m.campaign_id ORDER BY"
                      + " c.rowid DESC, CASE WHEN u.id=c.owner THEN 0 ELSE 1 END,u.name")) {
            var state = parse((String) row.get("state"));
            profiles.add(
                obj(
                    "id",
                    row.get("id"),
                    "name",
                    row.get("name"),
                    "campaign",
                    text(state, "name"),
                    "role",
                    row.get("id").equals(row.get("owner")) ? "gm" : "player"));
          }
          return obj("profiles", profiles, "openAccess", true);
        });
  }

  public AuthService.Identity identity(String selected) {
    var profiles = profiles().path("profiles");
    String id = selected == null || selected.isBlank() ? text(profiles.get(0), "id") : selected;
    for (var profile : profiles) {
      if (text(profile, "id").equals(id))
        return new AuthService.Identity(id, text(profile, "name"), text(profile, "name"), "");
    }
    throw new GameException(404, "Profil introuvable. Choisissez un profil dans la liste.");
  }

  public ObjectNode createPlayer(AuthService.Identity gm, ObjectNode action) {
    require(text(action, "type").equals("create"), "Seule la création de profils est disponible.");
    String name =
        ActionValidation.string(action, "username", 3, 30).toLowerCase(java.util.Locale.ROOT);
    require(name.matches("[a-z0-9_.]{3,30}"), "Nom de profil invalide.");
    String faction = ActionValidation.string(action, "faction", 1, 60);
    return db.transaction(
        c -> {
          var row =
              one(
                  c,
                  "SELECT c.* FROM campaigns c JOIN memberships m ON m.campaign_id=c.id WHERE"
                      + " m.user_id=? AND c.owner=?",
                  gm.id(),
                  gm.id());
          require(row != null, "Choisissez la vue GM pour ajouter un joueur.");
          require(
              one(c, "SELECT id FROM user WHERE lower(username)=?", name) == null,
              "Ce nom est déjà utilisé.");
          String user = id();
          long now = System.currentTimeMillis();
          var state = campaigns.settle(parse((String) row.get("state")), now);
          campaigns.addPlayer(state, user, name, faction);
          AccountService.insert(c, user, name, null, now);
          update(c, "INSERT INTO memberships VALUES(?,?)", user, row.get("id"));
          update(
              c,
              "UPDATE campaigns SET state=?,revision=revision+1 WHERE id=?",
              state.toString(),
              row.get("id"));
          return obj("id", user, "username", name);
        });
  }
}
