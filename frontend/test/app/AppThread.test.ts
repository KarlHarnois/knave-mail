import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";
import { MailFixtures } from "../support/MailFixtures";

const FOCUSED = '[data-test~="focused-message"]';

class ThreadHarness {
  static async opened(configure?: Parameters<typeof AppHarness.started>[0]): Promise<AppHarness> {
    const app = await AppHarness.started(configure);
    await app.press("l");
    return app;
  }

  static focusedMessageId(): string | undefined {
    return document.querySelector<HTMLElement>(FOCUSED)?.dataset["messageId"];
  }
}

describe("thread view", () => {
  test("l opens the selected thread", async () => {
    const app = await ThreadHarness.opened();
    expect(app.core.lastArgsFor("thread")).toEqual({ account: MailFixtures.ADA, threadId: "t-0" });
    expect(app.isVisible('[data-test="thread-view"]')).toBe(true);
    expect(app.isVisible('[data-test="thread-list"]')).toBe(false);
    expect(app.status("mode")).toBe("THREAD");
  });

  test("J opens the next thread in the list", async () => {
    const app = await ThreadHarness.opened();
    await app.press("J");
    expect(app.core.lastArgsFor("thread")["threadId"]).toBe("t-1");
    expect(app.status("mode")).toBe("THREAD");
  });

  test("K opens the previous thread in the list", async () => {
    const app = await AppHarness.started();
    await app.press("jj<CR>");
    await app.press("K");
    expect(app.core.lastArgsFor("thread")["threadId"]).toBe("t-1");
  });

  test("a count skips threads", async () => {
    const app = await ThreadHarness.opened();
    await app.press("2J");
    expect(app.core.lastArgsFor("thread")["threadId"]).toBe("t-2");
  });

  test("K on the first thread stays on it", async () => {
    const app = await ThreadHarness.opened();
    const requests = app.core.requestsFor("thread").length;
    await app.press("K");
    expect(app.core.requestsFor("thread").length).toBe(requests);
  });

  test("going back after J selects the thread that was read", async () => {
    const app = await ThreadHarness.opened();
    await app.press("Jq");
    expect(app.driver.text('[data-test~="selected-row"]')).toContain("Subject 1");
  });

  test("enter opens the thread too", async () => {
    const app = await AppHarness.started();
    await app.press("j<CR>");
    expect(app.core.lastArgsFor("thread")["threadId"]).toBe("t-1");
  });

  test("shows every message with the newest expanded and focused", async () => {
    const app = await ThreadHarness.opened();
    expect(app.driver.count('[data-test~="message"]')).toBe(3);
    expect(ThreadHarness.focusedMessageId()).toBe("m-2");
    expect(document.querySelector<HTMLElement>(FOCUSED)?.dataset["expanded"]).toBe("true");
    expect(document.querySelector<HTMLElement>('[data-message-id="m-0"]')?.dataset["expanded"]).toBe("false");
  });

  test("opening an unread thread marks it read", async () => {
    const app = await ThreadHarness.opened();
    expect(app.core.lastArgsFor("mark-read")).toEqual({ account: MailFixtures.ADA, threadIds: ["t-0"] });
  });

  test("[ and ] jump between messages and expand them", async () => {
    const app = await ThreadHarness.opened();
    await app.press("2[");
    expect(ThreadHarness.focusedMessageId()).toBe("m-0");
    expect(document.querySelector<HTMLElement>(FOCUSED)?.dataset["expanded"]).toBe("true");
    await app.press("]");
    expect(ThreadHarness.focusedMessageId()).toBe("m-1");
  });

  test("j and k scroll the thread a line at a time and take a count", async () => {
    const app = await ThreadHarness.opened();
    const view = document.querySelector<HTMLElement>('[data-test="thread-view"]');
    await app.press("3j");
    expect(view?.scrollTop).toBe(180);
    await app.press("k");
    expect(view?.scrollTop).toBe(120);
  });

  test("gg goes back to the top of the thread", async () => {
    const app = await ThreadHarness.opened();
    const view = document.querySelector<HTMLElement>('[data-test="thread-view"]');
    await app.press("5jgg");
    expect(view?.scrollTop).toBe(0);
    expect(ThreadHarness.focusedMessageId()).toBe("m-0");
  });

  test("G goes to the bottom of the thread", async () => {
    const app = await ThreadHarness.opened();
    const view = document.querySelector<HTMLElement>('[data-test="thread-view"]');
    Object.defineProperty(view, "scrollHeight", { value: 900 });
    await app.press("ggG");
    expect(view?.scrollTop).toBe(900);
    expect(ThreadHarness.focusedMessageId()).toBe("m-2");
  });

  test("plain text messages render as text", async () => {
    const app = await ThreadHarness.opened();
    expect(app.driver.text(`${FOCUSED} [data-test="message-text"]`)).toBe("Plain body of message 2\nsecond line 2");
  });

  test("h and q go back to the list", async () => {
    const app = await ThreadHarness.opened();
    await app.press("h");
    expect(app.isVisible('[data-test="thread-list"]')).toBe(true);
    expect(app.status("mode")).toBe("LIST");
    await app.press("lq");
    expect(app.status("mode")).toBe("LIST");
  });

  test(":q goes back to the list", async () => {
    const app = await ThreadHarness.opened();
    await app.press(":q<CR>");
    expect(app.status("mode")).toBe("LIST");
  });

  test("e archives the thread and stays on it marked archived", async () => {
    const app = await ThreadHarness.opened();
    await app.press("e");
    expect(app.core.lastArgsFor("archive")["threadIds"]).toEqual(["t-0"]);
    expect(app.status("mode")).toBe("THREAD");
    expect(app.driver.text('[data-test="thread-archived"]')).toBe("archived");
  });

  test("e again moves the thread back to the inbox", async () => {
    const app = await ThreadHarness.opened();
    await app.press("ee");
    expect(app.core.lastArgsFor("move-to-inbox")["threadIds"]).toEqual(["t-0"]);
    expect(app.driver.text('[data-test="thread-archived"]')).toBe("");
  });

  test("leaving an archived inbox thread drops it from the list", async () => {
    const app = await ThreadHarness.opened();
    await app.press("eq");
    expect(app.status("mode")).toBe("LIST");
    expect(app.selectedThreadId()).toBe("t-1");
    expect(app.driver.text('[data-test~="thread-list"]')).not.toContain("Subject 0");
  });

  test("J after e opens the next thread and drops the archived one", async () => {
    const app = await ThreadHarness.opened();
    await app.press("eJ");
    expect(app.core.lastArgsFor("thread")["threadId"]).toBe("t-1");
    await app.press("q");
    expect(app.selectedThreadId()).toBe("t-1");
  });

  test("# trashes the thread", async () => {
    const app = await ThreadHarness.opened();
    await app.press("#");
    expect(app.core.lastArgsFor("trash")["threadIds"]).toEqual(["t-0"]);
  });

  test("s and U toggle star and unread on the open thread", async () => {
    const app = await ThreadHarness.opened();
    expect(app.driver.text('[data-test="thread-star"]')).toBe("");
    await app.press("s");
    expect(app.driver.text('[data-test="thread-star"]')).toBe("★");
    expect(app.status("mode")).toBe("THREAD");
    await app.press("U");
    expect(app.core.lastArgsFor("mark-unread")["threadIds"]).toEqual(["t-0"]);
  });

  test("u in a thread undoes the last action and goes back to the list", async () => {
    const app = await ThreadHarness.opened();
    await app.press("s");
    await app.press("u");
    expect(app.core.lastArgsFor("unstar")["threadIds"]).toEqual(["t-0"]);
    expect(app.status("mode")).toBe("LIST");
  });

  test("opening an unread thread leaves nothing to undo", async () => {
    const app = await ThreadHarness.opened();
    await app.press("u");
    expect(app.status("error")).toContain("nothing to undo");
  });

  test("I moves the open thread to the inbox", async () => {
    const app = await ThreadHarness.opened();
    await app.press("I");
    expect(app.core.lastArgsFor("move-to-inbox")["threadIds"]).toEqual(["t-0"]);
  });

  test("a failed thread load shows the error in the status line", async () => {
    const app = await ThreadHarness.opened((core) =>
      core.failNext("thread", { kind: "not-found", message: "no thread t-0" }),
    );
    expect(app.status("error")).toBe("thread: not-found: no thread t-0");
  });

  test("gi from a thread goes back to the inbox list", async () => {
    const app = await ThreadHarness.opened();
    await app.press("gi");
    expect(app.status("mode")).toBe("LIST");
  });
});

describe("HTML messages", () => {
  const withHtml = (core: { thread: ReturnType<typeof MailFixtures.thread> }) => {
    core.thread = {
      ...MailFixtures.thread(1),
      messages: [MailFixtures.message(0, { html: '<p>Hi <img src="https://example.com/a.png"></p>' })],
    };
  };

  test("render in a sandboxed iframe with remote images blocked", async () => {
    await ThreadHarness.opened(withHtml);
    const frame = document.querySelector<HTMLIFrameElement>('[data-test="message-html"]');
    expect(frame?.getAttribute("sandbox")).toBe("allow-same-origin allow-popups");
    expect(frame?.tabIndex).toBe(-1);
    expect(frame?.srcdoc).toContain("img-src data: cid:;");
  });

  test("i reloads the focused message with remote images", async () => {
    const app = await ThreadHarness.opened(withHtml);
    await app.press("i");
    expect(document.querySelector<HTMLIFrameElement>('[data-test="message-html"]')?.srcdoc).toContain(
      "img-src data: cid: https: http:",
    );
  });
});
