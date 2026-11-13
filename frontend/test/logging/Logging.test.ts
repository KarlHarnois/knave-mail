import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";

describe("logging", () => {
  test("an error shown in the status line is also logged as a warning", async () => {
    const app = await AppHarness.started();
    app.core.failNext("threads", { kind: "network", message: "offline" });
    await app.press("gi");
    expect(app.core.logged).toContainEqual({ level: "warn", message: "threads: network: offline" });
  });

  test("an unhandled rejection is logged as an error", async () => {
    const app = await AppHarness.started();
    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("boom") }) as PromiseRejectionEvent,
    );
    expect(app.core.logged.some((entry) => entry.level === "error" && entry.message.includes("boom"))).toBe(true);
  });

  test("an uncaught error is logged with where it happened", async () => {
    const app = await AppHarness.started();
    window.dispatchEvent(new ErrorEvent("error", { message: "kaput", filename: "app.js", lineno: 3, colno: 7 }));
    expect(app.core.logged).toContainEqual({ level: "error", message: "uncaught error: kaput at app.js:3:7" });
  });

  test("the launch time is logged once the inbox is shown", async () => {
    const app = await AppHarness.started();
    expect(app.core.logged.some((entry) => entry.level === "info" && entry.message.startsWith("inbox shown"))).toBe(
      true,
    );
  });
});
