import { beforeEach, describe, expect, test } from "bun:test";
import { KeyboardInput } from "../src/KeyboardInput";

class KeyboardFixture {
  readonly pressed: string[] = [];
  readonly target = new EventTarget() as unknown as Document;

  constructor() {
    new KeyboardInput((token) => this.pressed.push(token)).listen(this.target);
  }

  type(init: KeyboardEventInit, origin: EventTarget = document.body): KeyboardEvent {
    const event = new KeyboardEvent("keydown", { ...init, cancelable: true });
    Object.defineProperty(event, "target", { value: origin });
    this.target.dispatchEvent(event);
    return event;
  }
}

describe("KeyboardInput", () => {
  let keyboard: KeyboardFixture;

  beforeEach(() => {
    keyboard = new KeyboardFixture();
  });

  test("turns key events into tokens and keeps them from the browser", () => {
    const event = keyboard.type({ key: "n", ctrlKey: true });
    expect(keyboard.pressed).toEqual(["<C-n>"]);
    expect(event.defaultPrevented).toBe(true);
  });

  test("ignores lone modifier keys", () => {
    const event = keyboard.type({ key: "Control", ctrlKey: true });
    expect(keyboard.pressed).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  test("leaves keys typed inside an editor to the editor", () => {
    const editor = document.createElement("div");
    editor.className = "cm-editor";
    const content = document.createElement("div");
    editor.append(content);
    keyboard.type({ key: "j" }, content);
    expect(keyboard.pressed).toEqual([]);
  });
});
