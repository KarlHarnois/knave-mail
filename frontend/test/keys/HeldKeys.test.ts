import { describe, expect, test } from "bun:test";
import { HeldKeys } from "../../src/keys/HeldKeys";

describe("keys pressed while the app starts", () => {
  test("wait until release, then arrive in order", () => {
    const delivered: string[] = [];
    const keys = new HeldKeys((token) => delivered.push(token));
    keys.press("g");
    keys.press("i");
    expect(delivered).toEqual([]);
    keys.release();
    expect(delivered).toEqual(["g", "i"]);
  });

  test("arrive at once after release", () => {
    const delivered: string[] = [];
    const keys = new HeldKeys((token) => delivered.push(token));
    keys.release();
    keys.press("j");
    expect(delivered).toEqual(["j"]);
  });
});
