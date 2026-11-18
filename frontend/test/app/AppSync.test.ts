import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";
import { MailFixtures } from "../support/MailFixtures";

describe("sync", () => {
  test("R syncs and the synced event reloads the list", async () => {
    const app = await AppHarness.started();
    await app.press("R");
    expect(app.core.lastArgsFor("sync")).toEqual({ account: MailFixtures.ADA });
    expect(app.status("sync")).toBe("syncing…");
    app.core.emit({ event: "synced", account: MailFixtures.ADA });
    await app.driver.whenIdle();
    expect(app.status("sync")).toStartWith("synced");
    expect(app.core.requestsFor("threads")).toHaveLength(2);
  });

  test("a sync-failed event shows the error", async () => {
    const app = await AppHarness.started();
    await app.press(":sync<CR>");
    app.core.emit({
      event: "sync-failed",
      account: MailFixtures.ADA,
      error: { kind: "auth-required", message: "sign in again" },
    });
    expect(app.status("sync")).toBe("sync failed");
    expect(app.status("error")).toBe("sync: auth-required: sign in again");
  });

  test("a sync that Gmail throttles shows as paused, not failed", async () => {
    const app = await AppHarness.started();
    await app.press(":sync<CR>");
    app.core.emit({
      event: "sync-failed",
      account: MailFixtures.ADA,
      error: { kind: "throttled", message: "Gmail is rate limiting this account" },
    });
    expect(app.status("sync")).toBe("sync paused by Gmail's rate limit");
    expect(app.status("error")).toBe("");
  });

  test("events for another account leave the status alone", async () => {
    const app = await AppHarness.started();
    app.core.emit({ event: "synced", account: MailFixtures.GRACE });
    await app.driver.whenIdle();
    expect(app.status("sync")).toBe("syncing…");
    expect(app.core.requestsFor("threads")).toHaveLength(1);
  });

  test("opening the window syncs every account", async () => {
    const app = await AppHarness.started();
    expect(app.core.requestsFor("sync").map((request) => request.args)).toEqual([
      { account: MailFixtures.ADA },
      { account: MailFixtures.GRACE },
    ]);
    expect(app.status("sync")).toBe("syncing…");
  });

  test("switching to an account synced moments ago does not sync it again", async () => {
    const app = await AppHarness.started();
    await app.press("<C-n>");
    expect(app.core.requestsFor("sync")).toHaveLength(2);
  });

  test("a sync-progress event shows the mail synced so far and keeps syncing", async () => {
    const app = await AppHarness.started();
    app.core.emit({ event: "sync-progress", account: MailFixtures.ADA });
    await app.driver.whenIdle();
    expect(app.core.requestsFor("threads")).toHaveLength(2);
    expect(app.status("sync")).toBe("syncing…");
  });

  test("progress for another account does not reload the list", async () => {
    const app = await AppHarness.started();
    app.core.emit({ event: "sync-progress", account: MailFixtures.GRACE });
    await app.driver.whenIdle();
    expect(app.core.requestsFor("threads")).toHaveLength(1);
  });
});
