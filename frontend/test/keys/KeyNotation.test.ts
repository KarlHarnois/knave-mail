import { describe, expect, test } from "bun:test";
import { KeyNotation } from "../../src/keys/KeyNotation";

const notation = new KeyNotation();

class KeyEvents {
  static down(init: KeyboardEventInit): KeyboardEvent {
    return new KeyboardEvent("keydown", init);
  }
}

describe("KeyNotation.tokenize", () => {
  test("plain characters become one token each", () => {
    expect(notation.tokenize("5jgg")).toEqual(["5", "j", "g", "g"]);
  });

  test("control keys use <C-x> notation", () => {
    expect(notation.tokenize("<C-n><c-P>")).toEqual(["<C-n>", "<C-p>"]);
  });

  test("named keys are normalised", () => {
    expect(notation.tokenize("<CR><esc><Enter><BS><Space>")).toEqual(["<CR>", "<Esc>", "<CR>", "<BS>", " "]);
  });

  test("<lt> types a literal less-than sign", () => {
    expect(notation.tokenize("a<lt>b")).toEqual(["a", "<", "b"]);
  });

  test("an unknown bracket is typed literally", () => {
    expect(notation.tokenize("<nope>")).toEqual(["<", "n", "o", "p", "e", ">"]);
  });

  test("a command line sequence keeps spaces", () => {
    expect(notation.tokenize(":label Work<CR>")).toEqual([
      ":",
      "l",
      "a",
      "b",
      "e",
      "l",
      " ",
      "W",
      "o",
      "r",
      "k",
      "<CR>",
    ]);
  });
});

describe("KeyNotation.fromEvent", () => {
  test("printable keys pass through", () => {
    expect(notation.fromEvent(KeyEvents.down({ key: "#" }))).toBe("#");
  });

  test("control combinations use <C-x>", () => {
    expect(notation.fromEvent(KeyEvents.down({ key: "n", ctrlKey: true }))).toBe("<C-n>");
  });

  test("special keys use their names", () => {
    expect(notation.fromEvent(KeyEvents.down({ key: "Enter" }))).toBe("<CR>");
    expect(notation.fromEvent(KeyEvents.down({ key: "Escape" }))).toBe("<Esc>");
  });

  test("lone modifiers produce no token", () => {
    expect(notation.fromEvent(KeyEvents.down({ key: "Shift", shiftKey: true }))).toBeNull();
  });

  test("alt and meta combinations are left to the system", () => {
    expect(notation.fromEvent(KeyEvents.down({ key: "q", metaKey: true }))).toBeNull();
    expect(notation.fromEvent(KeyEvents.down({ key: "q", altKey: true }))).toBeNull();
  });
});
