package fr.royaumes;

public class GameException extends RuntimeException {
  public final int status;

  public GameException(String message) {
    this(400, message);
  }

  public GameException(int status, String message) {
    super(message);
    this.status = status;
  }
}
