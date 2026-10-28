package fr.royaumes;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;

/** JSON compatibility boundary: campaign snapshots retain all existing fields. */
public final class Json {
  public static final ObjectMapper MAPPER = new ObjectMapper();

  private Json() {}

  public static ObjectNode obj(Object... pairs) {
    ObjectNode result = MAPPER.createObjectNode();
    for (int i = 0; i < pairs.length; i += 2)
      result.set((String) pairs[i], MAPPER.valueToTree(pairs[i + 1]));
    return result;
  }

  public static ArrayNode array() {
    return MAPPER.createArrayNode();
  }

  public static ObjectNode object(JsonNode n) {
    if (!(n instanceof ObjectNode o)) throw new GameException("Objet invalide.");
    return o;
  }

  public static ObjectNode parse(String s) {
    try {
      return object(MAPPER.readTree(s));
    } catch (Exception e) {
      throw new GameException("JSON invalide.");
    }
  }

  public static String text(JsonNode n, String key) {
    return n.path(key).asText("");
  }

  public static ObjectNode ensure(ObjectNode n, String key) {
    if (!n.path(key).isObject()) n.set(key, obj());
    return object(n.get(key));
  }

  public static ArrayNode list(ObjectNode n, String key) {
    if (!n.path(key).isArray()) n.set(key, array());
    return (ArrayNode) n.get(key);
  }

  public static List<ObjectNode> objects(JsonNode a) {
    var r = new ArrayList<ObjectNode>();
    a.forEach(n -> r.add(object(n)));
    return r;
  }

  public static void require(boolean condition, String message) {
    if (!condition) throw new GameException(message);
  }

  public static String id() {
    return UUID.randomUUID().toString();
  }
}
