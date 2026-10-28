package fr.royaumes;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.text.Normalizer;
import java.util.*;
import org.bouncycastle.crypto.generators.SCrypt;
import org.springframework.stereotype.Component;

/** Exact Better Auth compatibility: NFKC, UTF-8 hex salt, scrypt N=16384 r=16 p=1 dkLen=64. */
@Component
public class Passwords {
  private final SecureRandom random = new SecureRandom();

  public String randomToken(int bytes) {
    byte[] value = new byte[bytes];
    random.nextBytes(value);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
  }

  private byte[] derive(String password, String salt) {
    return SCrypt.generate(
        Normalizer.normalize(password, Normalizer.Form.NFKC).getBytes(StandardCharsets.UTF_8),
        salt.getBytes(StandardCharsets.UTF_8),
        16384,
        16,
        1,
        64);
  }

  public String hash(String password) {
    byte[] saltBytes = new byte[16];
    random.nextBytes(saltBytes);
    String salt = HexFormat.of().formatHex(saltBytes);
    return salt + ":" + HexFormat.of().formatHex(derive(password, salt));
  }

  public boolean verify(String hash, String password) {
    if (hash == null || !hash.matches("[0-9a-f]{32}:[0-9a-f]{128}")) return false;
    var parts = hash.split(":");
    return MessageDigest.isEqual(derive(password, parts[0]), HexFormat.of().parseHex(parts[1]));
  }

  public static String digest(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
