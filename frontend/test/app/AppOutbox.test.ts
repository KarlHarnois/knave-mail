import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";
import { MailFixtures } from "../support/MailFixtures";

const NOT_FOUND = { kind: "not-found" as const, message: "no thread t-1" };

describe("queued changes", () => {
  test("a queue event shows how many changes wait for the account", async () => {
    const app = await AppHarness.started();
    app.core.emit({ event: "queue", account: MailFixtures.ADA, waiting: 3 });
    expect(app.status("waiting")).toBe("3 changes waiting");
  });

  test("the count clears once every change reached Gmail", async () => {
    const app = await AppHarness.started();
    app.core.emit({ event: "queue", account: MailFixtures.ADA, waiting: 1 });
    app.core.emit({ event: "queue", account: MailFixtures.ADA, waiting: 0 });
    expect(app.status("waiting")).toBe("");
  });

  test("another account's count shows once that account is on screen", async () => {
    const app = await AppHarness.started();
    app.core.emit({ event: "queue", account: MailFixtures.GRACE, waiting: 1 });
    expect(app.status("waiting")).toBe("");
    await app.press("<C-n>");
    expect(app.status("waiting")).toBe("1 change waiting");
  });

  test("a refused change shows the error and reloads the list", async () => {
    const app = await AppHarness.started();
    const listed = app.core.requestsFor("threads").length;
    app.core.emit({
      event: "operation-failed",
      account: MailFixtures.ADA,
      name: "relabel",
      threadIds: ["t-1"],
      error: NOT_FOUND,
    });
    await app.driver.whenIdle();
    expect(app.status("error")).toBe("Gmail refused 1 label change: not-found: no thread t-1");
    expect(app.core.requestsFor("threads")).toHaveLength(listed + 1);
  });

  test("a queue event is not mistaken for a failed sync", async () => {
    const app = await AppHarness.started();
    app.core.emit({ event: "queue", account: MailFixtures.ADA, waiting: 2 });
    expect(app.status("sync")).toBe("syncing…");
  });
});
