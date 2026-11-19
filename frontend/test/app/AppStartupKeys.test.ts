import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";

describe("keys pressed before the accounts load", () => {
  test("R pressed during startup waits for the account instead of failing", async () => {
    const app = await AppHarness.started(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "R" }));
    });
    expect(app.core.logged.filter((entry) => entry.message.includes("no account"))).toEqual([]);
  });
});
