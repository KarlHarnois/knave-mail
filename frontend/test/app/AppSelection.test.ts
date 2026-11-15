import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";
import { MailFixtures } from "../support/MailFixtures";

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

  test("a sync reload keeps the selection on the same threads", async () => {
    let threads = MailFixtures.summaries(50);
    const app = await AppHarness.started((core) => core.answerWith("threads", () => threads));
    await app.press("5jVj");
    threads = [MailFixtures.summary(-2), MailFixtures.summary(-1), ...MailFixtures.summaries(50)];
    app.core.emit({ event: "synced", account: MailFixtures.ADA });
    await app.driver.whenIdle();
    await app.press("#");
    expect(app.core.lastArgsFor("trash")["threadIds"]).toEqual(["t-5", "t-6"]);
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

  test("u undoes archives made one by one, one at a time, newest first", async () => {
    const app = await AppHarness.started();
    await app.press("e");
    await app.press("e");
    await app.press("u");
    expect(app.core.requestsFor("move-to-inbox").map((request) => request.args["threadIds"])).toEqual([["t-1"]]);
    await app.press("u");
    expect(app.core.requestsFor("move-to-inbox").map((request) => request.args["threadIds"])).toEqual([
      ["t-1"],
      ["t-0"],
    ]);
  });

  test("u undoes star, unstar and read changes with their opposite", async () => {
    const app = await AppHarness.started();
    await app.press("su");
    expect(app.core.lastArgsFor("unstar")["threadIds"]).toEqual(["t-0"]);
    await app.press("Uu");
    expect(app.core.lastArgsFor("mark-unread")["threadIds"]).toEqual(["t-0"]);
  });

  test("u after a mixed star toggle unstars only the thread it starred", async () => {
    const app = await AppHarness.started((core) =>
      core.answerWith("threads", () => [MailFixtures.summary(0, { starred: true }), MailFixtures.summary(1)]),
    );
    await app.press("Vjs");
    await app.press("u");
    expect(app.core.lastArgsFor("unstar")["threadIds"]).toEqual(["t-1"]);
  });

  test("u after a mixed read toggle marks unread only the thread it marked read", async () => {
    const app = await AppHarness.started();
    await app.press("VjU");
    expect(app.core.lastArgsFor("mark-read")["threadIds"]).toEqual(["t-0", "t-1"]);
    await app.press("u");
    expect(app.core.lastArgsFor("mark-unread")["threadIds"]).toEqual(["t-0"]);
  });

  test("u after a mixed archive in a label moves back only the thread it archived", async () => {
    const app = await AppHarness.started((core) =>
      core.answerWith("threads", () => [
        MailFixtures.summary(0, { labels: ["Label_7"] }),
        MailFixtures.summary(1, { labels: ["INBOX", "Label_7"] }),
      ]),
    );
    await app.press(":label Receipts<CR>");
    await app.press("Vje");
    expect(app.core.lastArgsFor("archive")["threadIds"]).toEqual(["t-0", "t-1"]);
    await app.press("u");
    expect(app.core.lastArgsFor("move-to-inbox")["threadIds"]).toEqual(["t-1"]);
  });

  test("u has nothing left to undo once every change is undone", async () => {
    const app = await AppHarness.started();
    await app.press("eu");
    await app.press("u");
    expect(app.status("error")).toContain("nothing to undo");
    expect(app.core.requestsFor("move-to-inbox")).toHaveLength(1);
  });

  test("archiving in all mail marks the row as archived", async () => {
    const app = await AppHarness.started();
    await app.press("ga");
    await app.press("e");
    expect(app.driver.text('[data-thread-id="t-0"] .row-archived')).toBe("archived");
  });

  test("e on an archived thread moves it back to the inbox", async () => {
    const app = await AppHarness.started();
    await app.press("ga");
    await app.press("ee");
    expect(app.core.lastArgsFor("move-to-inbox")["threadIds"]).toEqual(["t-0"]);
    expect(app.driver.text('[data-thread-id="t-0"] .row-archived')).toBe("");
  });

  test("e on a mixed selection archives every thread", async () => {
    const app = await AppHarness.started();
    await app.press("ga");
    await app.press("e");
    await app.press("Vje");
    expect(app.core.lastArgsFor("archive")["threadIds"]).toEqual(["t-0", "t-1"]);
    expect(app.core.requestsFor("move-to-inbox")).toHaveLength(0);
  });

  test("e on a selection that is all archived moves it back", async () => {
    const app = await AppHarness.started();
    await app.press("ga");
    await app.press("Vje");
    await app.press("Vke");
    expect(app.core.lastArgsFor("move-to-inbox")["threadIds"]).toEqual(["t-0", "t-1"]);
  });

  test("archiving reports how many threads it archived", async () => {
    const app = await AppHarness.started();
    await app.press("Vje");
    expect(app.status("notice")).toBe("archived 2 threads");
  });

  test("archiving in another label keeps the row with its mark", async () => {
    const app = await AppHarness.started();
    await app.press(":label Receipts<CR>");
    await app.press("e");
    expect(app.driver.text('[data-thread-id="t-0"] .row-archived')).toBe("archived");
  });

  test("moving to the inbox removes the archived mark", async () => {
    const app = await AppHarness.started();
    await app.press("ga");
    await app.press("eI");
    expect(app.driver.text('[data-thread-id="t-0"] .row-archived')).toBe("");
  });

  test("I moves the selected threads to the inbox", async () => {
    const app = await AppHarness.started();
    await app.press("ga");
    await app.press("VjI");
    expect(app.core.lastArgsFor("move-to-inbox")["threadIds"]).toEqual(["t-0", "t-1"]);
  });
});

describe("label changes in flight", () => {
  test("a sync reload that lands before the archive is answered keeps the thread hidden", async () => {
    const app = await AppHarness.started();
    app.core.holdReplies("archive");
    app.driver.press("e");
    app.core.emit({ event: "synced", account: MailFixtures.ADA });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(app.driver.count('[data-thread-id="t-0"]')).toBe(0);
    app.core.releaseReplies();
    await app.driver.whenIdle();
  });
});
