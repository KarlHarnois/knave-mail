import { describe, expect, test } from "bun:test";
import { AppHarness } from "./support/AppHarness";
import { MailFixtures } from "./support/MailFixtures";

describe("visual mode", () => {
  const Chosen = '[data-test~="chosen-row"]';

  test("V starts a selection and shows VISUAL", async () => {
    const app = await AppHarness.started();
    await app.press("V");
    expect(app.status("mode")).toBe("VISUAL");
    expect(app.driver.count(Chosen)).toBe(1);
  });

  test("j and k extend the selection from where it started", async () => {
    const app = await AppHarness.started();
    await app.press("jV3jk");
    expect(app.driver.count(Chosen)).toBe(3);
  });

  test("the selection extends upward too", async () => {
    const app = await AppHarness.started();
    await app.press("3jvkk");
    expect(app.driver.count(Chosen)).toBe(3);
  });

  test("e archives every selected thread in one request", async () => {
    const app = await AppHarness.started();
    await app.press("jV2je");
    expect(app.core.requestsFor("archive")).toHaveLength(1);
    expect(app.core.lastArgsFor("archive")).toEqual({ account: MailFixtures.ADA, threadIds: ["t-1", "t-2", "t-3"] });
    expect(app.driver.count('[data-thread-id="t-2"]')).toBe(0);
  });

  test("an action ends the selection", async () => {
    const app = await AppHarness.started();
    await app.press("Vj#");
    expect(app.core.lastArgsFor("trash")).toEqual({ account: MailFixtures.ADA, threadIds: ["t-0", "t-1"] });
    expect(app.status("mode")).toBe("LIST");
    expect(app.driver.count(Chosen)).toBe(0);
  });

  test("s stars every selected thread unless all are starred", async () => {
    const app = await AppHarness.started();
    await app.press("Vjs");
    expect(app.core.lastArgsFor("star")).toEqual({ account: MailFixtures.ADA, threadIds: ["t-0", "t-1"] });
    await app.press("Vks");
    expect(app.core.lastArgsFor("unstar")).toEqual({ account: MailFixtures.ADA, threadIds: ["t-0", "t-1"] });
  });

  test("U marks every selected thread read when any of them is unread", async () => {
    const app = await AppHarness.started();
    await app.press("VjU");
    expect(app.core.requestsFor("mark-read")).toHaveLength(1);
    expect(app.core.lastArgsFor("mark-read")["threadIds"]).toHaveLength(2);
  });

  test("escape cancels the selection without acting", async () => {
    const app = await AppHarness.started();
    await app.press("Vjj<Esc>e");
    expect(app.core.lastArgsFor("archive")["threadIds"]).toEqual(["t-2"]);
  });

  test("V again cancels the selection", async () => {
    const app = await AppHarness.started();
    await app.press("VjV");
    expect(app.status("mode")).toBe("LIST");
    expect(app.driver.count(Chosen)).toBe(0);
  });

  test("enter opens the thread under the cursor and ends the selection", async () => {
    const app = await AppHarness.started();
    await app.press("Vj<CR>");
    expect(app.core.lastArgsFor("thread")["threadId"]).toBe("t-1");
    await app.press("q");
    expect(app.driver.count(Chosen)).toBe(0);
  });
});

describe("undo and inbox", () => {
  test("u undoes an archive by moving the thread back to the inbox", async () => {
    const app = await AppHarness.started();
    await app.press("je");
    await app.press("u");
    expect(app.core.lastArgsFor("move-to-inbox")).toEqual({ account: MailFixtures.ADA, threadIds: ["t-1"] });
  });

  test("u reloads the list after undoing", async () => {
    const app = await AppHarness.started();
    await app.press("e");
    await app.press("u");
    expect(app.core.requestsFor("threads")).toHaveLength(2);
  });

  test("u undoes a whole visual batch at once", async () => {
    const app = await AppHarness.started();
    await app.press("Vjj#");
    await app.press("u");
    expect(app.core.requestsFor("untrash")).toHaveLength(1);
    expect(app.core.lastArgsFor("untrash")["threadIds"]).toEqual(["t-0", "t-1", "t-2"]);
  });

  test("u undoes star, unstar and read changes with their opposite", async () => {
    const app = await AppHarness.started();
    await app.press("su");
    expect(app.core.lastArgsFor("unstar")["threadIds"]).toEqual(["t-0"]);
    await app.press("Uu");
    expect(app.core.lastArgsFor("mark-unread")["threadIds"]).toEqual(["t-0"]);
  });

  test("a second u has nothing left to undo", async () => {
    const app = await AppHarness.started();
    await app.press("eu");
    await app.press("u");
    expect(app.status("error")).toContain("nothing to undo");
    expect(app.core.requestsFor("move-to-inbox")).toHaveLength(1);
  });

  test("I moves the selected threads to the inbox", async () => {
    const app = await AppHarness.started();
    await app.press("ga");
    await app.press("VjI");
    expect(app.core.lastArgsFor("move-to-inbox")["threadIds"]).toEqual(["t-0", "t-1"]);
  });
});
