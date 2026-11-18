import { describe, expect, test } from "bun:test";
import { LineEditor } from "../../src/commands/LineEditor";

class EditedLine {
  readonly editor: LineEditor = new LineEditor();

  constructor(text: string) {
    this.editor.replace(text);
  }

  press(...tokens: string[]): EditedLine {
    for (const token of tokens) this.editor.press(token);
    return this;
  }

  shown(): string {
    return `${this.editor.beforeCursor}[${this.editor.underCursor}]${this.editor.afterCursor}`;
  }
}

describe("line editor", () => {
  test("<C-w> deletes the word before the cursor and the spaces after it", () => {
    expect(new EditedLine("label work  ").press("<C-w>").editor.text).toBe("label ");
  });

  test("<C-u> deletes from the cursor to the start of the line", () => {
    expect(new EditedLine("label work").press("<Left>", "<Left>", "<C-u>").shown()).toBe("[r]k");
  });

  test("<C-k> deletes from the cursor to the end of the line", () => {
    expect(new EditedLine("label work").press("<Left>", "<Left>", "<C-k>").shown()).toBe("label wo[]");
  });

  test("<C-h> deletes the character before the cursor, like <BS>", () => {
    expect(new EditedLine("sync").press("<C-h>").editor.text).toBe("syn");
    expect(new EditedLine("sync").press("<BS>").editor.text).toBe("syn");
  });

  test("<C-a> selects the line, and the next character replaces it", () => {
    const line = new EditedLine("label work").press("<C-a>");
    expect(line.editor.isAllSelected).toBe(true);
    expect(line.press("h").editor.text).toBe("h");
  });

  test("any deletion after <C-a> clears the line", () => {
    for (const deletion of ["<C-w>", "<C-u>", "<C-k>", "<C-h>", "<BS>"]) {
      expect(new EditedLine("from:alice bob").press("<C-a>", deletion).editor.text).toBe("");
    }
  });

  test("<C-e> moves the cursor to the end of the line", () => {
    expect(new EditedLine("sync").press("<Left>", "<Left>", "<C-e>").shown()).toBe("sync[]");
  });

  test("typing inserts at the cursor", () => {
    expect(new EditedLine("snc").press("<Left>", "<Left>", "y").shown()).toBe("sy[n]c");
  });

  test("a key it does not edit with is left to the caller", () => {
    expect(new LineEditor().press("<CR>")).toBe(false);
  });
});
