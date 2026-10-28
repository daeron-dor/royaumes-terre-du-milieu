package fr.royaumes;

import static fr.royaumes.Database.*;
import static fr.royaumes.Json.*;
import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;

class AuthRaceTest {
  @TempDir Path directory;

  @Test
  void resetDuringLoginCannotRecreateRevokedSession() throws Exception {
    var db = new Database(directory.resolve("race.sqlite").toString());
    var realPasswords = new Passwords();
    String oldPassword = "Synthetic old password 123!";
    String oldHash = realPasswords.hash(oldPassword);
    String newHash = realPasswords.hash("Synthetic new password 456!");
    db.transaction(
        c -> {
          AccountService.insert(c, "player", "player", oldHash, 0);
          return null;
        });
    // Deterministically interleave a reset after verification, before session insertion.
    var passwords =
        new Passwords() {
          @Override
          public boolean verify(String hash, String password) {
            boolean accepted = super.verify(hash, password);
            db.transaction(
                c -> {
                  update(c, "UPDATE account SET password=? WHERE userId=?", newHash, "player");
                  update(c, "DELETE FROM java_sessions WHERE user_id=?", "player");
                  return null;
                });
            return accepted;
          }
        };
    var auth = new AuthService(db, passwords);
    var error =
        assertThrows(
            GameException.class,
            () ->
                auth.login(
                    obj("username", "player", "password", oldPassword),
                    new MockHttpServletRequest()));
    assertEquals(401, error.status);
    assertTrue(db.read(c -> rows(c, "SELECT * FROM java_sessions")).isEmpty());
  }
}
