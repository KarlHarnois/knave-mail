import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";

describe("screen-relative moves", () => {
  test("H, M and L are bound in the thread list", async () => {
    const app = await AppHarness.started();
    await app.press("L");
    const bottom = app.selectedThreadId();
    await app.press("H");
    expect(app.selectedThreadId()).toBe("t-0");
    await app.press("M");
    expect(app.selectedThreadId()).not.toBe(bottom);
    expect(bottom).not.toBe("t-49");
  });
});
