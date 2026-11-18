import { describe, expect, test } from "bun:test";
import { MatchMarks } from "../../src/rows/MatchMarks";

class MarkedRow {
  readonly element: HTMLElement = document.createElement("div");

  constructor(...cells: string[]) {
    for (const text of cells) {
      const cell = document.createElement("span");
      cell.textContent = text;
      this.element.append(cell);
    }
  }

  marked(): string[] {
    return [...this.element.querySelectorAll(".list-match")].map((mark) => mark.textContent ?? "");
  }
}

describe("match marks", () => {
  test("marks every occurrence of the query in each cell, keeping its case", () => {
    const row = new MarkedRow("gi", "Go to the inbox, Gone");
    new MatchMarks().show(row.element, "go");
    expect(row.marked()).toEqual(["Go", "Go"]);
    expect(row.element.textContent).toBe("giGo to the inbox, Gone");
  });

  test("an empty query removes the marks", () => {
    const row = new MarkedRow("Archive");
    const marks = new MatchMarks();
    marks.show(row.element, "arch");
    marks.show(row.element, "");
    expect(row.marked()).toEqual([]);
    expect(row.element.textContent).toBe("Archive");
  });
});
