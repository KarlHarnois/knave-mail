import { describe, expect, test } from "bun:test";
import { ListCursor } from "../../src/list/ListCursor";

class CursorFixture {
  static over(total: number): ListCursor {
    const cursor = new ListCursor();
    cursor.resize(total);
    return cursor;
  }
}

describe("ListCursor", () => {
  test("starts on the first row", () => {
    expect(CursorFixture.over(10).index).toBe(0);
  });

  test("moves by a delta", () => {
    const cursor = CursorFixture.over(10);
    cursor.moveBy(5);
    expect(cursor.index).toBe(5);
  });

  test("stops at the last row", () => {
    const cursor = CursorFixture.over(10);
    cursor.moveBy(50);
    expect(cursor.index).toBe(9);
  });

  test("stops at the first row", () => {
    const cursor = CursorFixture.over(10);
    cursor.moveBy(-3);
    expect(cursor.index).toBe(0);
  });

  test("jumps to the first and last rows", () => {
    const cursor = CursorFixture.over(10);
    cursor.moveToLast();
    expect(cursor.index).toBe(9);
    cursor.moveToFirst();
    expect(cursor.index).toBe(0);
  });

  test("shrinking the list pulls the cursor back inside it", () => {
    const cursor = CursorFixture.over(10);
    cursor.moveTo(8);
    cursor.resize(4);
    expect(cursor.index).toBe(3);
  });

  test("an empty list keeps the cursor at zero", () => {
    const cursor = CursorFixture.over(0);
    cursor.moveBy(1);
    cursor.moveToLast();
    expect(cursor.index).toBe(0);
  });
});
