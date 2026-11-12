import { describe, expect, test } from "bun:test";
import { ListWindow } from "../../src/list/ListWindow";

const ROW_HEIGHT = 30;
const VIEWPORT = 300;
const listWindow = new ListWindow(ROW_HEIGHT, 5);

describe("ListWindow.visibleRange", () => {
  test("covers the visible rows plus overscan at the top of the list", () => {
    expect(listWindow.visibleRange(1000, 0, VIEWPORT)).toEqual({ start: 0, end: 16 });
  });

  test("starts overscan rows above the first visible row", () => {
    expect(listWindow.visibleRange(1000, 300, VIEWPORT)).toEqual({ start: 5, end: 26 });
  });

  test("never extends past the end of the list", () => {
    expect(listWindow.visibleRange(12, 0, VIEWPORT)).toEqual({ start: 0, end: 12 });
  });

  test("is empty for an empty list", () => {
    expect(listWindow.visibleRange(0, 0, VIEWPORT)).toEqual({ start: 0, end: 0 });
  });

  test("stays small for a long list", () => {
    const range = listWindow.visibleRange(100_000, 1_500_000, VIEWPORT);
    expect(range.end - range.start).toBeLessThan(30);
  });
});

describe("ListWindow.scrollTopToReveal", () => {
  test("keeps the scroll position when the row is visible", () => {
    expect(listWindow.scrollTopToReveal(3, 0, VIEWPORT)).toBe(0);
  });

  test("scrolls down just enough to show a row below the viewport", () => {
    expect(listWindow.scrollTopToReveal(10, 0, VIEWPORT)).toBe(30);
  });

  test("scrolls up to a row above the viewport", () => {
    expect(listWindow.scrollTopToReveal(2, 600, VIEWPORT)).toBe(60);
  });
});

describe("ListWindow sizes", () => {
  test("counts whole rows per page", () => {
    expect(listWindow.rowsPerPage(VIEWPORT + 10)).toBe(10);
  });

  test("measures content and row offsets in row heights", () => {
    expect(listWindow.contentHeight(1000)).toBe(30_000);
    expect(listWindow.offsetOf(7)).toBe(210);
  });
});
