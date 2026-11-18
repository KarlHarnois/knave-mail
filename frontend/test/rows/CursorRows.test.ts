import { describe, expect, test } from "bun:test";
import { CursorRows } from "../../src/rows/CursorRows";

class RowsFixture {
  readonly rows: CursorRows = new CursorRows();

  constructor(...texts: string[]) {
    for (const text of texts) {
      const cell = document.createElement("span");
      cell.textContent = text;
      this.rows.add(document.createElement("div"), [cell]);
    }
  }
}

describe("cursor rows", () => {
  test("counts the rows a search matches", () => {
    expect(new RowsFixture("Archive", "Trash", "Unarchive").rows.matchCount("arch")).toBe("1/2");
  });

  test("a blank query matches nothing, as the search does", () => {
    expect(new RowsFixture("Archive", "Trash").rows.matchCount("  ")).toBe("0/0");
  });
});
