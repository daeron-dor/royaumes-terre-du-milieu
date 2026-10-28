package fr.royaumes;

import static fr.royaumes.Json.*;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@ConditionalOnProperty(name = "royaumes.open-access", havingValue = "true", matchIfMissing = true)
public class OpenApiController {
  private final OpenAccess access;
  private final GameService game;
  private final AccountService accounts;
  private final String origin;

  public OpenApiController(
      OpenAccess access,
      GameService game,
      AccountService accounts,
      @Value("${royaumes.origin}") String origin) {
    this.access = access;
    this.game = game;
    this.accounts = accounts;
    this.origin = origin;
  }

  private ResponseEntity<String> reply(ObjectNode value) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_JSON)
        .cacheControl(CacheControl.noStore())
        .header("Vary", "X-Realm-Profile")
        .header("X-Content-Type-Options", "nosniff")
        .body(value.toString());
  }

  private ObjectNode body(HttpServletRequest request) throws Exception {
    if (!origin.equals(request.getHeader("Origin"))
        || "cross-site".equals(request.getHeader("Sec-Fetch-Site")))
      throw new GameException(403, "Origine invalide.");
    byte[] bytes = request.getInputStream().readNBytes(4097);
    if (bytes.length > 4096) throw new GameException(413, "Requête trop volumineuse.");
    return parse(new String(bytes, StandardCharsets.UTF_8));
  }

  private AuthService.Identity profile(HttpServletRequest request) {
    return access.identity(request.getHeader("X-Realm-Profile"));
  }

  @GetMapping("/api/profiles")
  public ResponseEntity<String> profiles() {
    return reply(access.profiles());
  }

  @GetMapping("/api/game")
  public ResponseEntity<String> game(HttpServletRequest request) {
    return reply(game.get(profile(request), null));
  }

  @PostMapping("/api/game")
  public ResponseEntity<String> action(HttpServletRequest request) throws Exception {
    var action = body(request);
    return reply(game.command(profile(request), action));
  }

  @GetMapping("/api/accounts")
  public ResponseEntity<String> players(HttpServletRequest request) {
    return reply(accounts.list(profile(request)));
  }

  @PostMapping("/api/accounts")
  public ResponseEntity<String> create(HttpServletRequest request) throws Exception {
    var action = body(request);
    return reply(access.createPlayer(profile(request), action));
  }

  @RequestMapping("/api/auth/{*path}")
  public ResponseEntity<String> removed() {
    throw new GameException(
        410, "La connexion et les mots de passe ont été supprimés. Accès libre aux profils.");
  }

  @GetMapping("/api/health")
  public ResponseEntity<String> health() {
    return reply(obj("status", "ok", "backend", "Spring Boot", "openAccess", true));
  }

  @ExceptionHandler(GameException.class)
  public ResponseEntity<String> error(GameException error) {
    return ResponseEntity.status(error.status)
        .contentType(MediaType.APPLICATION_JSON)
        .cacheControl(CacheControl.noStore())
        .body(obj("error", error.getMessage()).toString());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<String> error(Exception error) {
    org.slf4j.LoggerFactory.getLogger(getClass()).error("Échec API accès libre", error);
    return ResponseEntity.status(503)
        .contentType(MediaType.APPLICATION_JSON)
        .cacheControl(CacheControl.noStore())
        .body(obj("error", "Service indisponible. Réessayez.").toString());
  }
}
