import { describe, expect, test } from "bun:test";
import { CommandPalette, type PaletteEntry } from "../../src/commands/CommandPalette";

class PaletteFixture {
  readonly palette: CommandPalette = new CommandPalette(document);
  readonly ran: string[] = [];

  constructor() {
    this.palette.open({
      prompt: ":",
      label: "Commands",
      mode: "COMMAND",
      takesArguments: true,
      entries: [this.entry("sync", "R"), this.entry("label", "<name>", true), this.entry("labels", "gl")],
      runTyped: (text) => this.ran.push(`typed ${text}`),
    });
  }

  press(...tokens: string[]): PaletteFixture {
    for (const token of tokens) this.palette.press(token);
    return this;
  }

  rows(): string[] {
    return [...this.palette.element.querySelectorAll(".palette-name")].map((row) => row.textContent ?? "");
  }

  selected(): string {
    return this.palette.element.querySelector('[aria-selected="true"] .palette-name')?.textContent ?? "";
  }

  count(): string {
    return this.palette.element.querySelector(".command-line-count")?.textContent ?? "";
  }

  typed(): string {
    return this.palette.element.querySelector(".command-line-text")?.textContent ?? "";
  }

  private entry(name: string, keys: string, takesArgument = false): PaletteEntry {
    return { name, keys, takesArgument, run: () => this.ran.push(name) };
  }
}

describe("command palette", () => {
  test("lists every entry and counts the selection", () => {
    const fixture = new PaletteFixture();
    expect(fixture.rows()).toEqual(["sync", "label", "labels"]);
    expect(fixture.count()).toBe("1/3");
  });

  test("typing filters the entries by name", () => {
    expect(new PaletteFixture().press("l", "a", "b").rows()).toEqual(["label", "labels"]);
  });

  test("<C-j> and <C-k> move the selection, as in fzf", () => {
    const fixture = new PaletteFixture().press("<C-j>", "<C-j>", "<C-k>");
    expect(fixture.selected()).toBe("label");
    expect(fixture.count()).toBe("2/3");
  });

  test("<CR> runs the selected entry and closes", () => {
    const fixture = new PaletteFixture().press("<C-n>", "<C-n>", "<CR>");
    expect(fixture.ran).toEqual(["labels"]);
    expect(fixture.palette.isOpen).toBe(false);
  });

  test("<CR> on an entry that takes an argument completes its name", () => {
    const fixture = new PaletteFixture().press("<C-n>", "<CR>");
    expect(fixture.palette.isOpen).toBe(true);
    expect(fixture.typed()).toBe("label ");
  });

  test("a typed command with an argument runs as typed", () => {
    const fixture = new PaletteFixture().press(..."label work".split(""), "<CR>");
    expect(fixture.ran).toEqual(["typed label work"]);
  });

  test("an entry named exactly as typed is highlighted first", () => {
    expect(new PaletteFixture().press(..."label".split("")).selected()).toBe("label");
  });

  test("<CR> runs the highlighted entry", () => {
    expect(new PaletteFixture().press(..."labels".split(""), "<CR>").ran).toEqual(["labels"]);
  });

  test("typed text that matches no entry runs as typed", () => {
    expect(new PaletteFixture().press("n", "o", "p", "e", "<CR>").ran).toEqual(["typed nope"]);
  });

  test("<BS> on an empty prompt closes the palette", () => {
    expect(new PaletteFixture().press("<BS>").palette.isOpen).toBe(false);
  });

  test("a failed load closes the palette and reports the error", async () => {
    const palette = new CommandPalette(document);
    const reported: unknown[] = [];
    const failure = new Error("labels: timed out");
    let closed = 0;
    palette.open({
      prompt: "/",
      label: "Labels",
      mode: "LABELS",
      takesArguments: false,
      entries: Promise.reject(failure),
      runTyped: () => undefined,
      reportLoadError: (error) => reported.push(error),
      closed: () => {
        closed += 1;
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(palette.isOpen).toBe(false);
    expect(reported).toEqual([failure]);
    expect(closed).toBe(1);
  });

  test("keys typed after a choice made while loading go on to the app", async () => {
    const palette = new CommandPalette(document);
    const passed: string[] = [];
    const chosen: string[] = [];
    palette.open({
      prompt: "/",
      label: "Labels",
      mode: "LABELS",
      takesArguments: false,
      entries: Promise.resolve([{ name: "Work", keys: "", takesArgument: false, run: () => chosen.push("Work") }]),
      runTyped: () => undefined,
      passKey: (token) => passed.push(token),
    });
    for (const token of ["w", "<CR>", "j"]) palette.press(token);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chosen).toEqual(["Work"]);
    expect(passed).toEqual(["j"]);
  });

  test("<C-k> deletes to the end of the line while no suggestion shows", () => {
    const fixture = new PaletteFixture().press("x", "y", "z", "<Left>", "<Left>", "<C-k>");
    expect(fixture.typed()).toBe("x");
  });
});
