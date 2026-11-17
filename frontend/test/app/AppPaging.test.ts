import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";
import { MailFixtures } from "../support/MailFixtures";

const OLDER_PAGE = { threads: [MailFixtures.summary(99)], nextPageToken: "p2" };

describe("loading older threads from Gmail", () => {
  test("moving near the end of a label asks Gmail for the first page", async () => {
    const app = await AppHarness.started();
    await app.press("G");
    expect(app.core.lastArgsFor("thread-page")).toMatchObject({ label: "INBOX", query: "", limit: 50, pageToken: "" });
  });

  test("a search pages through Gmail too", async () => {
    const app = await AppHarness.started();
    await app.press("/invoice<CR>");
    expect(app.core.lastArgsFor("threads")["limit"]).toBe(50);
    await app.press("G");
    expect(app.core.lastArgsFor("thread-page")).toMatchObject({ query: "invoice", pageToken: "" });
  });

  test("older threads from a page join the end of the list", async () => {
    const app = await AppHarness.started((core) => core.answerWith("thread-page", () => OLDER_PAGE));
    await app.press("G");
    await app.press("G");
    expect(app.selectedThreadId()).toBe("t-99");
  });

  test("the next page is asked for with the token Gmail returned", async () => {
    const app = await AppHarness.started((core) => core.answerWith("thread-page", () => OLDER_PAGE));
    await app.press("G");
    await app.press("ggG");
    expect(app.core.lastArgsFor("thread-page")["pageToken"]).toBe("p2");
  });

  test("paging stops once Gmail returns no next token", async () => {
    const app = await AppHarness.started();
    await app.press("G");
    await app.press("ggG");
    expect(app.core.requestsFor("thread-page")).toHaveLength(1);
  });

  test("a sync reload keeps the pages already loaded", async () => {
    const app = await AppHarness.started((core) => core.answerWith("thread-page", () => OLDER_PAGE));
    await app.press("G");
    app.core.emit({ event: "synced", account: MailFixtures.ADA });
    await app.driver.whenIdle();
    await app.press("G");
    expect(app.selectedThreadId()).toBe("t-99");
  });

  test("a thread archived after its page loaded stays gone after a sync reload", async () => {
    let threads = MailFixtures.summaries(5);
    const app = await AppHarness.started((core) => {
      core.answerWith("threads", () => threads);
      core.answerWith("thread-page", () => ({ threads: MailFixtures.summaries(5), nextPageToken: "" }));
    });
    await app.press("G");
    await app.press("gge");
    threads = MailFixtures.summaries(5).slice(1);
    app.core.emit({ event: "synced", account: MailFixtures.ADA });
    await app.driver.whenIdle();
    expect(app.driver.count('[data-thread-id="t-0"]')).toBe(0);
  });

  test("a thread archived from a loaded page stays gone when the next page loads", async () => {
    const app = await AppHarness.started((core) => {
      core.answerWith("threads", () => MailFixtures.summaries(3));
      core.answerWith("thread-page", (args) =>
        args["pageToken"] === "" ? OLDER_PAGE : { threads: [MailFixtures.summary(100)], nextPageToken: "" },
      );
    });
    await app.press("G");
    app.core.holdReplies("thread-page");
    app.driver.press("Ge");
    await new Promise((resolve) => setTimeout(resolve, 30));
    app.core.releaseReplies();
    await app.driver.whenIdle();
    expect(app.core.requestsFor("thread-page")).toHaveLength(2);
    expect(app.driver.count('[data-thread-id="t-99"]')).toBe(0);
  });

  test("gi answers while a page is still loading, and the late page is dropped", async () => {
    const app = await AppHarness.started((core) => {
      core.answerWith("thread-page", () => OLDER_PAGE);
      core.answerWith("threads", () => MailFixtures.summaries(3));
    });
    await app.press("ga");
    app.core.holdReplies("thread-page");
    app.driver.press("G");
    app.driver.press("gi");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(app.status("label")).toStartWith("Inbox");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("INBOX");
    app.core.releaseReplies();
    await app.driver.whenIdle();
    expect(app.driver.count('[data-thread-id="t-99"]')).toBe(0);
  });

  test("a page Gmail throttles is not asked for again right away", async () => {
    const app = await AppHarness.started((core) =>
      core.failNext("thread-page", { kind: "throttled", message: "Gmail is rate limiting this account" }),
    );
    await app.press("G");
    await app.press("ggG");
    expect(app.core.requestsFor("thread-page")).toHaveLength(1);
  });
});
