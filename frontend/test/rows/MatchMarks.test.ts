import { describe, expect, test } from "bun:test";
import { MatchMarks } from "../../src/rows/MatchMarks";

class MarkedRow {
  readonly element: HTMLElement = document.createElement("div");
  readonly cells: HTMLElement[] = [];

  constructor(...cells: string[]) {
    for (const text of cells) {
      const cell = document.createElement("span");
      cell.textContent = text;
      this.element.append(cell);
      this.cells.push(cell);
    }
  }

  marked(): string[] {
    return [...this.element.querySelectorAll(".list-match")].map((mark) => mark.textContent ?? "");
  }
}

describe("match marks", () => {
  test("marks every occurrence of the query in each cell, keeping its case", () => {
    const row = new MarkedRow("gi", "Go to the inbox, Gone");
    new MatchMarks().show(row.cells, "go");
    expect(row.marked()).toEqual(["Go", "Go"]);
    expect(row.element.textContent).toBe("giGo to the inbox, Gone");
  });

  test("an empty query removes the marks", () => {
    const row = new MarkedRow("Archive");
    const marks = new MatchMarks();
    marks.show(row.cells, "arch");
    marks.show(row.cells, "");
    expect(row.marked()).toEqual([]);
    expect(row.element.textContent).toBe("Archive");
  });

  test("only the cells passed in are marked", () => {
    const row = new MarkedRow("2024 receipts", "12");
    new MatchMarks().show(row.cells.slice(0, 1), "2");
    expect(row.marked()).toEqual(["2", "2"]);
    expect(row.cells[1]?.querySelector(".list-match")).toBeNull();
  });

  test("a character that grows when lowercased does not shift the marks", () => {
    const row = new MarkedRow("İstanbul");
    new MatchMarks().show(row.cells, "stan");
    expect(row.marked()).toEqual(["stan"]);
  });
});
