import { describe, expect, test } from "bun:test";
import { KeyMap } from "../src/KeyMap";
import { ModalKeyMap } from "../src/ModalKeyMap";

const BINDINGS = [
  ["j", "down"],
  ["k", "up"],
  ["gg", "top"],
  ["gi", "inbox"],
  ["G", "bottom"],
  ["<C-d>", "halfPageDown"],
  ["<CR>", "open"],
] as const;

type Name = (typeof BINDINGS)[number][1];

class KeySequence {
  constructor(private readonly keyMap = new KeyMap<Name>(BINDINGS)) {}

  feedAll(...tokens: string[]) {
    return tokens.map((token) => this.keyMap.feed(token)).at(-1);
  }
}

describe("KeyMap", () => {
  test("a bound single key yields its action without a count", () => {
    expect(new KeySequence().feedAll("j")).toEqual({ kind: "action", action: "down", count: null });
  });

  test("digits before a key become its count", () => {
    expect(new KeySequence().feedAll("5", "j")).toEqual({ kind: "action", action: "down", count: 5 });
  });

  test("multi-digit counts include zeros after the first digit", () => {
    expect(new KeySequence().feedAll("1", "0", "0", "k")).toEqual({ kind: "action", action: "up", count: 100 });
  });

  test("a leading zero is not a count", () => {
    expect(new KeySequence().feedAll("0")).toEqual({ kind: "unknown" });
  });

  test("a digit is pending until a key completes the count", () => {
    expect(new KeySequence().feedAll("3")).toEqual({ kind: "pending" });
  });

  test("g alone waits for the rest of the sequence", () => {
    expect(new KeySequence().feedAll("g")).toEqual({ kind: "pending" });
  });

  test("gg completes the top action", () => {
    expect(new KeySequence().feedAll("g", "g")).toEqual({ kind: "action", action: "top", count: null });
  });

  test("g prefixes share the first key", () => {
    expect(new KeySequence().feedAll("g", "i")).toEqual({ kind: "action", action: "inbox", count: null });
  });

  test("a count applies to a prefixed sequence", () => {
    expect(new KeySequence().feedAll("4", "g", "g")).toEqual({ kind: "action", action: "top", count: 4 });
  });

  test("an unknown key after a prefix resets the state", () => {
    const keys = new KeySequence();
    expect(keys.feedAll("g", "x")).toEqual({ kind: "unknown" });
    expect(keys.feedAll("j")).toEqual({ kind: "action", action: "down", count: null });
  });

  test("an unknown key drops a pending count", () => {
    const keys = new KeySequence();
    keys.feedAll("7", "z");
    expect(keys.feedAll("j")).toEqual({ kind: "action", action: "down", count: null });
  });

  test("digits inside a sequence are not counts", () => {
    expect(new KeySequence().feedAll("g", "5")).toEqual({ kind: "unknown" });
  });

  test("bracketed notation binds control and named keys", () => {
    const keys = new KeySequence();
    expect(keys.feedAll("<C-d>")).toEqual({ kind: "action", action: "halfPageDown", count: null });
    expect(keys.feedAll("<CR>")).toEqual({ kind: "action", action: "open", count: null });
  });

  test("pending keys show the count and the partial sequence", () => {
    const keyMap = new KeyMap<Name>(BINDINGS);
    keyMap.feed("2");
    keyMap.feed("g");
    expect(keyMap.pendingKeys()).toBe("2g");
  });

  test("completing an action clears the pending keys", () => {
    const keyMap = new KeyMap<Name>(BINDINGS);
    keyMap.feed("2");
    keyMap.feed("j");
    expect(keyMap.pendingKeys()).toBe("");
  });
});

class ModalFixture {
  static keys(): ModalKeyMap<string, string> {
    const keyMaps = new Map([
      [
        "list",
        new KeyMap<string>([
          ["j", "moveDown"],
          ["gg", "top"],
        ]),
      ],
      [
        "thread",
        new KeyMap<string>([
          ["j", "nextMessage"],
          ["q", "back"],
        ]),
      ],
    ]);
    return new ModalKeyMap(keyMaps, "list");
  }
}

describe("ModalKeyMap", () => {
  test("the same key maps to the action of the active mode", () => {
    const keys = ModalFixture.keys();
    expect(keys.feed("j")).toEqual({ kind: "action", action: "moveDown", count: null });
    keys.switchTo("thread");
    expect(keys.feed("j")).toEqual({ kind: "action", action: "nextMessage", count: null });
  });

  test("switching modes drops a pending sequence", () => {
    const keys = ModalFixture.keys();
    keys.feed("3");
    keys.feed("g");
    keys.switchTo("thread");
    keys.switchTo("list");
    expect(keys.pendingKeys()).toBe("");
    expect(keys.feed("g")).toEqual({ kind: "pending" });
  });

  test("keys bound only in another mode are unknown", () => {
    expect(ModalFixture.keys().feed("q")).toEqual({ kind: "unknown" });
  });

  test("it reports the active mode", () => {
    const keys = ModalFixture.keys();
    keys.switchTo("thread");
    expect(keys.mode).toBe("thread");
  });

  test("switching to a mode without a key map fails fast", () => {
    expect(() => ModalFixture.keys().switchTo("compose")).toThrow("no key map for mode compose");
  });
});
