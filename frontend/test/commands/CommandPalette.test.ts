import { describe, expect, test } from "bun:test";
import { CommandPalette, type PaletteEntry } from "../../src/commands/CommandPalette";

class PaletteFixture {
  readonly palette: CommandPalette = new CommandPalette(document);
  readonly ran: string[] = [];

  constructor() {
    this.palette.open({
      prompt: ":",
      mode: "COMMAND",
      takesArguments: true,
      entries: [this.entry("sync", "R"), this.entry("label", "<name>", true), this.entry("labels", "gl")],
      runTyped: (text) => this.ran.push(`typed ${text}`),
      isCommand: (text) => ["sync", "label", "labels", "q"].includes(text.split(" ")[0] ?? ""),
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

  test("a typed command name runs as typed even when another entry is selected", () => {
    expect(new PaletteFixture().press("q", "<CR>").ran).toEqual(["typed q"]);
  });

  test("<BS> on an empty prompt closes the palette", () => {
    expect(new PaletteFixture().press("<BS>").palette.isOpen).toBe(false);
  });
});
