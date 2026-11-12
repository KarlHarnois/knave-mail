import { afterEach, describe, expect, test } from "bun:test";
import { Vim } from "@replit/codemirror-vim";
import type { KeymapEntry } from "../../src/vim/VimKeymap";
import { AppHarness } from "../support/AppHarness";

type KeymapWindow = Window & { knaveKeymap?: KeymapEntry[] };

const USER_KEYMAP: KeymapEntry[] = [
  { mode: "insert", keys: "jj", action: "<Esc>" },
  { mode: "normal", keys: "<CR>", action: "o<Esc>" },
];

class KeymapHarness {
  static async composing(): Promise<AppHarness> {
    (window as KeymapWindow).knaveKeymap = USER_KEYMAP;
    const app = await AppHarness.started();
    await app.press("c");
    return app;
  }
}

describe("user keymap", () => {
  afterEach(() => {
    delete (window as KeymapWindow).knaveKeymap;
    for (const entry of USER_KEYMAP) Vim.unmap(entry.keys, entry.mode);
  });

  test("jj in insert mode returns to normal mode without typing the j's", async () => {
    const app = await KeymapHarness.composing();
    await app.press("Gohellojj");
    expect(app.status("mode")).toBe("COMPOSE NORMAL");
    expect(app.composerText()).toContain("hello");
    expect(app.composerText()).not.toContain("helloj");
  });

  test("a single j in insert mode still types a j", async () => {
    const app = await KeymapHarness.composing();
    await app.press("Gojam<Esc>");
    expect(app.composerText()).toContain("jam");
  });

  test("enter in normal mode opens a line below and stays in normal mode", async () => {
    const app = await KeymapHarness.composing();
    const lines = () => document.querySelectorAll('[data-test~="composer"] .cm-line').length;
    const linesBefore = lines();
    await app.press("gg<CR>");
    expect(app.status("mode")).toBe("COMPOSE NORMAL");
    expect(lines()).toBe(linesBefore + 1);
  });
});
