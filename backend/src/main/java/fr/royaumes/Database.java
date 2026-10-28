package fr.royaumes;

import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * One SQLite transaction per command; concurrent readers never see partial account/campaign
 * updates.
 */
@Component
public class Database {
  private final String url;

  @FunctionalInterface
  public interface Work<T> {
    T run(Connection c) throws Exception;
  }

  public Database(@Value("${royaumes.database}") String filename) throws Exception {
    var path = Path.of(filename).toAbsolutePath().normalize();
    Files.createDirectories(path.getParent());
    url = "jdbc:sqlite:" + path;
    transaction(
        c -> {
          try (var statement = c.createStatement()) {
            statement.execute(
                "CREATE TABLE IF NOT EXISTS user(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT"
                    + " NOT NULL UNIQUE,emailVerified INTEGER NOT NULL,createdAt INTEGER NOT"
                    + " NULL,updatedAt INTEGER NOT NULL,image TEXT,username TEXT"
                    + " UNIQUE,displayUsername TEXT)");
            statement.execute(
                "CREATE TABLE IF NOT EXISTS account(id TEXT PRIMARY KEY,accountId TEXT NOT"
                    + " NULL,providerId TEXT NOT NULL,userId TEXT NOT NULL REFERENCES"
                    + " user(id),password TEXT,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT"
                    + " NULL)");
            statement.execute(
                "CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY,owner TEXT NOT NULL,code"
                    + " TEXT NOT NULL UNIQUE,state TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT"
                    + " 0)");
            statement.execute(
                "CREATE TABLE IF NOT EXISTS memberships(user_id TEXT PRIMARY KEY,campaign_id TEXT"
                    + " NOT NULL REFERENCES campaigns(id))");
            statement.execute(
                "CREATE TABLE IF NOT EXISTS java_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT"
                    + " NOT NULL REFERENCES user(id),expires INTEGER NOT NULL)");
            statement.execute(
                "CREATE INDEX IF NOT EXISTS java_sessions_user ON java_sessions(user_id)");
            statement.execute(
                "CREATE TABLE IF NOT EXISTS java_rate_limits(key TEXT PRIMARY KEY,started INTEGER"
                    + " NOT NULL,count INTEGER NOT NULL)");
          }
          return null;
        });
  }

  public synchronized <T> T transaction(Work<T> work) {
    try (var c = DriverManager.getConnection(url);
        var control = c.createStatement()) {
      control.execute("PRAGMA foreign_keys=ON");
      control.execute("PRAGMA busy_timeout=5000");
      control.execute("BEGIN IMMEDIATE");
      try {
        T result = work.run(c);
        control.execute("COMMIT");
        return result;
      } catch (Exception e) {
        control.execute("ROLLBACK");
        if (e instanceof RuntimeException r) throw r;
        throw new IllegalStateException("Transaction impossible", e);
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Base indisponible", e);
    }
  }

  public <T> T read(Work<T> work) {
    try (var c = DriverManager.getConnection(url)) {
      try (var s = c.createStatement()) {
        s.execute("PRAGMA busy_timeout=5000");
      }
      return work.run(c);
    } catch (RuntimeException e) {
      throw e;
    } catch (Exception e) {
      throw new IllegalStateException("Lecture impossible", e);
    }
  }

  public static List<Map<String, Object>> rows(Connection c, String sql, Object... args)
      throws SQLException {
    try (var stmt = c.prepareStatement(sql)) {
      bind(stmt, args);
      try (var rs = stmt.executeQuery()) {
        var out = new ArrayList<Map<String, Object>>();
        var meta = rs.getMetaData();
        while (rs.next()) {
          var row = new LinkedHashMap<String, Object>();
          for (int i = 1; i <= meta.getColumnCount(); i++)
            row.put(meta.getColumnLabel(i), rs.getObject(i));
          out.add(row);
        }
        return out;
      }
    }
  }

  public static Map<String, Object> one(Connection c, String sql, Object... args)
      throws SQLException {
    var rows = rows(c, sql, args);
    return rows.isEmpty() ? null : rows.getFirst();
  }

  public static int update(Connection c, String sql, Object... args) throws SQLException {
    try (var stmt = c.prepareStatement(sql)) {
      bind(stmt, args);
      return stmt.executeUpdate();
    }
  }

  private static void bind(PreparedStatement s, Object[] args) throws SQLException {
    for (int i = 0; i < args.length; i++) s.setObject(i + 1, args[i]);
  }
}
