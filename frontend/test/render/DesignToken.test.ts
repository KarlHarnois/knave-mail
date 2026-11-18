import { describe, expect, test } from "bun:test";
import { DesignToken } from "../../src/render/DesignToken";

describe("design token", () => {
  test("reads a token that resolves to pixels", () => {
    expect(new DesignToken(window).pixels("--component-list-item-height")).toBe(30);
  });

  test("a token that does not exist names the token", () => {
    expect(() => new DesignToken(window).pixels("--missing-token")).toThrow("--missing-token");
  });
});
