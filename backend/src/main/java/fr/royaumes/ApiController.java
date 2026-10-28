package fr.royaumes;

import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
    name = "royaumes.open-access",
    havingValue = "false")
public class ApiController {
  private final AuthService auth;
  private final GameService game;
  private final AccountService accounts;
  private final String origin;
  private final boolean secure;

  public ApiController(
      AuthService auth,
      GameService game,
      AccountService accounts,
      @Value("${royaumes.origin}") String origin) {
    this.auth = auth;
    this.game = game;
    this.accounts = accounts;
    this.origin = origin;
    var url = URI.create(origin);
    secure = url.getScheme().equals("https");
    require(
        secure || java.util.List.of("localhost", "127.0.0.1", "[::1]").contains(url.getHost()),
        "HTTPS obligatoire hors localhost.");
    require(
        url.getRawPath() == null || url.getRawPath().isEmpty(),
        "PUBLIC_ORIGIN doit être une origine sans chemin.");
  }

  private ObjectNode body(HttpServletRequest req) throws Exception {
    if (!origin.equals(req.getHeader("Origin"))
        || "cross-site".equals(req.getHeader("Sec-Fetch-Site")))
      throw new GameException(403, "Origine invalide.");
    byte[] bytes = req.getInputStream().readNBytes(4097);
    if (bytes.length > 4096) throw new GameException(413, "Requête trop volumineuse.");
    return parse(new String(bytes, StandardCharsets.UTF_8));
  }

  private ResponseEntity<String> reply(Object value) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_JSON)
        .cacheControl(CacheControl.noStore())
        .header("Vary", "Cookie")
        .header("X-Content-Type-Options", "nosniff")
        .body(value == null ? "null" : value.toString());
  }

  private void cookie(HttpServletResponse res, String token, long age) {
    var builder =
        ResponseCookie.from(AuthService.COOKIE, token)
            .path("/")
            .httpOnly(true)
            .secure(secure)
            .sameSite("Lax");
    if (age >= 0) builder.maxAge(age);
    res.addHeader("Set-Cookie", builder.build().toString());
  }

  @GetMapping("/api/game")
  public ResponseEntity<String> gameGet(
      HttpServletRequest req, @RequestParam(required = false) String invite) {
    return reply(game.get(auth.required(req), invite));
  }

  @PostMapping("/api/game")
  public ResponseEntity<String> gamePost(HttpServletRequest req) throws Exception {
    var a = body(req);
    return reply(game.command(auth.required(req), a));
  }

  @GetMapping("/api/accounts")
  public ResponseEntity<String> accountsGet(HttpServletRequest req) {
    return reply(accounts.list(auth.required(req)));
  }

  @PostMapping("/api/accounts")
  public ResponseEntity<String> accountsPost(HttpServletRequest req) throws Exception {
    var a = body(req);
    var u = auth.required(req);
    auth.limit("accounts:" + u.id(), 30);
    return reply(accounts.command(u, a));
  }

  @GetMapping("/api/auth/get-session")
  public ResponseEntity<String> session(HttpServletRequest req) {
    var u = auth.current(req);
    return reply(
        u == null
            ? null
            : obj("user", AuthService.publicUser(u), "session", obj("userId", u.id())));
  }

  @PostMapping("/api/auth/sign-in/username")
  public ResponseEntity<String> login(HttpServletRequest req, HttpServletResponse res)
      throws Exception {
    var login = auth.login(body(req), req);
    cookie(res, login.token(), login.maxAge());
    return reply(obj("user", AuthService.publicUser(login.identity())));
  }

  @PostMapping("/api/auth/sign-out")
  public ResponseEntity<String> logout(HttpServletRequest req, HttpServletResponse res)
      throws Exception {
    body(req);
    auth.logout(auth.current(req));
    cookie(res, "", 0);
    return reply(obj("success", true));
  }

  @PostMapping("/api/auth/change-password")
  public ResponseEntity<String> change(HttpServletRequest req) throws Exception {
    var a = body(req);
    auth.changePassword(auth.required(req), a);
    return reply(obj("success", true));
  }

  @RequestMapping("/api/auth/{*path}")
  public ResponseEntity<String> denied() {
    throw new GameException(403, "Les comptes sont gérés par le GM.");
  }

  @GetMapping("/api/health")
  public ResponseEntity<String> health() {
    return reply(obj("status", "ok", "backend", "Spring Boot"));
  }

  @ExceptionHandler(GameException.class)
  public ResponseEntity<String> error(GameException e) {
    return ResponseEntity.status(e.status)
        .contentType(MediaType.APPLICATION_JSON)
        .cacheControl(CacheControl.noStore())
        .body(obj("error", e.getMessage()).toString());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<String> unavailable(Exception e) {
    org.slf4j.LoggerFactory.getLogger(getClass()).error("Échec du traitement API", e);
    return ResponseEntity.status(503)
        .contentType(MediaType.APPLICATION_JSON)
        .cacheControl(CacheControl.noStore())
        .body(obj("error", "Service indisponible. Réessayez.").toString());
  }
}
