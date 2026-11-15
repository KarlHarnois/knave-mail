import { describe, expect, test } from "bun:test";
import { ColorTone } from "../../src/darkmail/ColorTone";

const tone = new ColorTone();

describe("color tone", () => {
  test("a dark background is dark", () => {
    expect(tone.isDark("rgb(18, 18, 18)")).toBe(true);
  });

  test("a light newsletter background is not dark", () => {
    expect(tone.isDark("rgb(253, 246, 227)")).toBe(false);
  });

  test("a fully transparent color counts as transparent", () => {
    expect(tone.isTransparent("rgba(0, 0, 0, 0)")).toBe(true);
    expect(tone.isTransparent("transparent")).toBe(true);
  });

  test("an opaque color is not transparent", () => {
    expect(tone.isTransparent("rgb(0, 0, 0)")).toBe(false);
    expect(tone.isTransparent("rgba(10, 10, 10, 0.5)")).toBe(false);
  });
});
