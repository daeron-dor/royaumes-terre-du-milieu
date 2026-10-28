package fr.royaumes;

import static fr.royaumes.Database.*;
import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.sql.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class AccountService {
  private final Database db;
  private final Passwords passwords;
  private final Campaigns campaigns;

  public AccountService(Database db, Passwords passwords, Campaigns campaigns) {
    this.db = db;
    this.passwords = passwords;
    this.campaigns = campaigns;
  }

  private Map<String, Object> gmCampaign(Connection c, AuthService.Identity user)
      throws SQLException {
    var row =
        one(
            c,
            "SELECT c.* FROM campaigns c JOIN memberships m ON m.campaign_id=c.id WHERE m.user_id=?"
                + " AND c.owner=?",
            user.id(),
            user.id());
    if (row == null) throw new GameException(403, "Gestion des comptes réservée au GM.");
    return row;
  }

  public ObjectNode list(AuthService.Identity user) {
    return db.read(
        c -> {
          var row = gmCampaign(c, user);
          return obj(
              "accounts",
              rows(
                  c,
                  "SELECT u.id,u.name,u.username FROM user u JOIN memberships m ON m.user_id=u.id"
                      + " WHERE m.campaign_id=? AND u.id<>?",
                  row.get("id"),
                  user.id()));
        });
  }

  public ObjectNode command(AuthService.Identity user, ObjectNode a) {
    // Check authorization before performing expensive password hashing.
    db.read(
        c -> {
          gmCampaign(c, user);
          return null;
        });
    String type = text(a, "type");
    require(type.equals("create") || type.equals("reset"), "Action inconnue.");
    String username =
        type.equals("create")
            ? ActionValidation.string(a, "username", 3, 30).toLowerCase(Locale.ROOT)
            : "";
    if (type.equals("create")) {
      require(username.matches("[a-z0-9_.]{3,30}"), "Pseudo invalide.");
      ActionValidation.string(a, "faction", 1, 60);
    } else ActionValidation.string(a, "userId", 1, 100);
    String password = passwords.randomToken(18), hash = passwords.hash(password);
    return db.transaction(
        c -> {
          var row = gmCampaign(c, user);
          long now = System.currentTimeMillis();
          if (type.equals("create")) {
            require(
                one(c, "SELECT id FROM user WHERE lower(username)=?", username) == null,
                "Ce pseudo ne peut pas être utilisé. Choisissez-en un autre.");
            String id = id();
            var s = campaigns.settle(parse((String) row.get("state")), now);
            campaigns.addPlayer(s, id, username, text(a, "faction"));
            insert(c, id, username, hash, now);
            update(c, "INSERT INTO memberships VALUES(?,?)", id, row.get("id"));
            update(
                c,
                "UPDATE campaigns SET state=?,revision=revision+1 WHERE id=?",
                s.toString(),
                row.get("id"));
            return obj("username", username, "password", password);
          }
          var target =
              one(
                  c,
                  "SELECT u.id,u.username FROM user u JOIN memberships m ON m.user_id=u.id WHERE"
                      + " u.id=? AND m.campaign_id=? AND u.id<>?",
                  text(a, "userId"),
                  row.get("id"),
                  user.id());
          if (target == null)
            throw new GameException(404, "Compte joueur introuvable dans votre campagne.");
          update(
              c,
              "UPDATE account SET password=?,updatedAt=? WHERE userId=? AND"
                  + " providerId='credential'",
              hash,
              now,
              target.get("id"));
          update(c, "DELETE FROM java_sessions WHERE user_id=?", target.get("id"));
          AuthService.revokeLegacy(c, (String) target.get("id"));
          return obj("username", target.get("username"), "password", password);
        });
  }

  public static void insert(Connection c, String id, String username, String hash, long now)
      throws SQLException {
    update(
        c,
        "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt,username,displayUsername)"
            + " VALUES(?,?,?,?,?,?,?,?)",
        id,
        username,
        id + "@accounts.invalid",
        1,
        now,
        now,
        username,
        username);
    update(
        c,
        "INSERT INTO account(id,accountId,providerId,userId,password,createdAt,updatedAt)"
            + " VALUES(?,?,?,?,?,?,?)",
        Json.id(),
        id,
        "credential",
        id,
        hash,
        now,
        now);
  }
}
