import { beforeEach, describe, expect, test } from "bun:test";
import { CommandLine } from "../src/CommandLine";

describe("CommandLine", () => {
  let commandLine: CommandLine;
  let submitted: string[];

  beforeEach(() => {
    commandLine = new CommandLine(document);
    submitted = [];
    commandLine.open(":", (text) => submitted.push(text));
  });

  test("starts closed and hidden", () => {
    const closed = new CommandLine(document);
    expect(closed.isOpen).toBe(false);
    expect(closed.element.hidden).toBe(true);
  });

  test("shows the prompt while open", () => {
    expect(commandLine.isOpen).toBe(true);
    expect(commandLine.element.hidden).toBe(false);
    expect(commandLine.prompt).toBe(":");
  });

  test("submits the typed text on enter and closes", () => {
    for (const token of ["s", "y", "n", "c", "<CR>"]) commandLine.press(token);
    expect(submitted).toEqual(["sync"]);
    expect(commandLine.isOpen).toBe(false);
  });

  test("escape closes without submitting", () => {
    commandLine.press("q");
    commandLine.press("<Esc>");
    expect(submitted).toEqual([]);
    expect(commandLine.isOpen).toBe(false);
  });

  test("backspace deletes, and closes on an empty line", () => {
    commandLine.press("a");
    commandLine.press("<BS>");
    expect(commandLine.isOpen).toBe(true);
    commandLine.press("<BS>");
    expect(commandLine.isOpen).toBe(false);
  });

  test("ignores keys that type nothing", () => {
    for (const token of ["q", "<C-n>", "<Up>", "<CR>"]) commandLine.press(token);
    expect(submitted).toEqual(["q"]);
  });

  test("ctrl-u clears the line", () => {
    for (const token of ["a", "b", "<C-u>", "c", "<CR>"]) commandLine.press(token);
    expect(submitted).toEqual(["c"]);
  });
});
