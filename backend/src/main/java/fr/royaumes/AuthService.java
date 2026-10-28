package fr.royaumes;

import static fr.royaumes.Database.*;
import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  public static final String COOKIE = "royaumes_java_session";

  public record Identity(String id, String name, String username, String tokenHash) {}

  public record Login(Identity identity, String token, long maxAge) {}

  private final Database db;
  private final Passwords passwords;
  private final String dummyHash;

  public AuthService(Database db, Passwords passwords) {
    this.db = db;
    this.passwords = passwords;
    dummyHash = passwords.hash(passwords.randomToken(24));
  }

  public Identity current(HttpServletRequest req) {
    if (req.getCookies() == null) return null;
    String token = null;
    for (var c : req.getCookies()) if (c.getName().equals(COOKIE)) token = c.getValue();
    if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) return null;
    String hash = Passwords.digest(token);
    return db.read(
        c -> {
          var row =
              one(
                  c,
                  "SELECT u.id,u.name,u.username FROM java_sessions s JOIN user u ON u.id=s.user_id"
                      + " WHERE s.token_hash=? AND s.expires>? AND u.emailVerified=1",
                  hash,
                  System.currentTimeMillis());
          return row == null
              ? null
              : new Identity(
                  (String) row.get("id"),
                  (String) row.get("name"),
                  (String) row.get("username"),
                  hash);
        });
  }

  public Identity required(HttpServletRequest request) {
    var user = current(request);
    if (user == null) throw new GameException(401, "Connectez-vous pour jouer.");
    return user;
  }

  public void limit(String key, int max) {
    boolean accepted =
        db.transaction(
            c -> {
              long now = System.currentTimeMillis();
              update(c, "DELETE FROM java_rate_limits WHERE started<?", now - 60000);
              var r = one(c, "SELECT count FROM java_rate_limits WHERE key=?", key);
              if (r != null && ((Number) r.get("count")).intValue() >= max) return false;
              update(
                  c,
                  "INSERT INTO java_rate_limits(key,started,count) VALUES(?,?,1) ON CONFLICT(key)"
                      + " DO UPDATE SET count=count+1",
                  key,
                  now);
              return true;
            });
    if (!accepted) throw new GameException(429, "Trop de tentatives. Réessayez dans une minute.");
  }

  public Login login(ObjectNode a, HttpServletRequest request) {
    String username = ActionValidation.string(a, "username", 3, 30).toLowerCase(Locale.ROOT),
        password = ActionValidation.string(a, "password", 1, 128);
    // Rate limit the account independently of any untrusted proxy/IP header.
    limit("login-user:" + Passwords.digest(username), 5);
    limit("login-ip:" + request.getRemoteAddr(), 100);
    var row =
        db.read(
            c ->
                one(
                    c,
                    "SELECT u.id,u.name,u.username,u.emailVerified,a.password FROM user u JOIN"
                        + " account a ON a.userId=u.id WHERE lower(u.username)=? AND"
                        + " a.providerId='credential'",
                    username));
    boolean verified =
        passwords.verify(
            row == null ? dummyHash : (String) row.get("password"), a.get("password").asText());
    if (row == null || !verified || ((Number) row.get("emailVerified")).intValue() != 1)
      throw new GameException(401, "Pseudo ou mot de passe incorrect.");
    String token = passwords.randomToken(32), hash = Passwords.digest(token);
    long age = 7 * 24 * 3600;
    db.transaction(
        c -> {
          // Password verification is expensive and runs outside the write lock. A GM reset
          // may have happened meanwhile: never recreate a session using the old password.
          var current =
              one(
                  c,
                  "SELECT u.id FROM user u JOIN account a ON a.userId=u.id WHERE u.id=?"
                      + " AND u.emailVerified=1 AND a.providerId='credential' AND a.password=?",
                  row.get("id"),
                  row.get("password"));
          if (current == null) throw new GameException(401, "Pseudo ou mot de passe incorrect.");
          update(c, "DELETE FROM java_sessions WHERE expires<?", System.currentTimeMillis());
          update(
              c,
              "INSERT INTO java_sessions VALUES(?,?,?)",
              hash,
              row.get("id"),
              System.currentTimeMillis() + age * 1000);
          return null;
        });
    return new Login(
        new Identity(
            (String) row.get("id"), (String) row.get("name"), (String) row.get("username"), hash),
        token,
        a.path("rememberMe").asBoolean() ? age : -1);
  }

  public void logout(Identity user) {
    if (user != null)
      db.transaction(
          c -> {
            update(c, "DELETE FROM java_sessions WHERE token_hash=?", user.tokenHash());
            return null;
          });
  }

  public void changePassword(Identity user, ObjectNode a) {
    limit("change:" + user.id(), 5);
    ActionValidation.string(a, "currentPassword", 1, 128);
    ActionValidation.string(a, "newPassword", 12, 128);
    String old =
        db.read(
            c ->
                (String)
                    one(
                            c,
                            "SELECT password FROM account WHERE userId=? AND"
                                + " providerId='credential'",
                            user.id())
                        .get("password"));
    require(
        passwords.verify(old, a.path("currentPassword").asText()),
        "Mot de passe actuel incorrect.");
    String hash = passwords.hash(a.path("newPassword").asText());
    db.transaction(
        c -> {
          int count =
              update(
                  c,
                  "UPDATE account SET password=?,updatedAt=? WHERE userId=? AND"
                      + " providerId='credential' AND password=?",
                  hash,
                  System.currentTimeMillis(),
                  user.id(),
                  old);
          require(count == 1, "Le compte a changé. Réessayez.");
          update(
              c,
              "DELETE FROM java_sessions WHERE user_id=? AND token_hash<>?",
              user.id(),
              user.tokenHash());
          revokeLegacy(c, user.id());
          return null;
        });
  }

  public static void revokeLegacy(java.sql.Connection c, String user) throws java.sql.SQLException {
    if (one(c, "SELECT name FROM sqlite_master WHERE type='table' AND name='session'") != null)
      update(c, "DELETE FROM session WHERE userId=?", user);
  }

  public static ObjectNode publicUser(Identity u) {
    return obj("id", u.id(), "name", u.name(), "username", u.username());
  }
}
