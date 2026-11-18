import { describe, expect, test } from "bun:test";
import { THREAD_LIMIT } from "../../src/mail/MailSession";
import { AppHarness } from "../support/AppHarness";
import { MailFixtures } from "../support/MailFixtures";

describe("app start", () => {
  test("loads the inbox of the first account, then syncs every account", async () => {
    const app = await AppHarness.started();
    expect(app.core.requests.map((request) => request.command)).toEqual([
      "accounts",
      "threads",
      "labels",
      "accounts",
      "sync",
      "sync",
    ]);
    expect(app.core.lastArgsFor("threads")).toEqual({
      account: MailFixtures.ADA,
      label: "INBOX",
      query: "",
      limit: THREAD_LIMIT,
    });
  });

  test("opens on the account the launcher asks for", async () => {
    (window as Window & { knaveStartAccount?: string }).knaveStartAccount = MailFixtures.GRACE;
    try {
      const app = await AppHarness.started();
      expect(app.status("account")).toBe(MailFixtures.GRACE);
    } finally {
      delete (window as Window & { knaveStartAccount?: string }).knaveStartAccount;
    }
  });

  test("shows mode, account and label in the status line", async () => {
    const app = await AppHarness.started();
    expect(app.status("mode")).toBe("LIST");
    expect(app.status("account")).toBe(MailFixtures.ADA);
    expect(app.status("label")).toBe("Inbox");
  });

  test("renders thread rows and selects the first", async () => {
    const app = await AppHarness.started();
    expect(app.driver.count('[data-test~="thread-row"]')).toBeGreaterThan(10);
    expect(app.selectedThreadId()).toBe("t-0");
  });

  test("shows an error when there is no account", async () => {
    const app = await AppHarness.started((core) => core.answerWith("accounts", () => []));
    expect(app.status("error")).toContain("no account");
  });
});

describe("list movement", () => {
  test("j with a count moves down", async () => {
    const app = await AppHarness.started();
    await app.press("5j");
    expect(app.selectedThreadId()).toBe("t-5");
  });

  test("k moves up and gg and G jump to the ends", async () => {
    const app = await AppHarness.started();
    await app.press("3jk");
    expect(app.selectedThreadId()).toBe("t-2");
    await app.press("G");
    expect(app.selectedThreadId()).toBe("t-49");
    await app.press("gg");
    expect(app.selectedThreadId()).toBe("t-0");
  });

  test("a pending prefix shows in the status line", async () => {
    const app = await AppHarness.started();
    await app.press("2g");
    expect(app.status("keys")).toBe("2g");
  });
});

describe("list locations", () => {
  test("ctrl-n and ctrl-p switch accounts", async () => {
    const app = await AppHarness.started();
    await app.press("<C-n>");
    expect(app.core.lastArgsFor("threads")["account"]).toBe(MailFixtures.GRACE);
    expect(app.status("account")).toBe(MailFixtures.GRACE);
    await app.press("<C-p>");
    expect(app.core.lastArgsFor("threads")["account"]).toBe(MailFixtures.ADA);
  });

  test("/ searches with a Gmail query", async () => {
    const app = await AppHarness.started();
    await app.press("/from:bob has:attachment<CR>");
    expect(app.core.lastArgsFor("threads")).toMatchObject({ label: "INBOX", query: "from:bob has:attachment" });
    expect(app.status("label")).toBe("Inbox /from:bob has:attachment");
  });

  test("a search asks Gmail for one page of results", async () => {
    const app = await AppHarness.started();
    await app.press("/invoice<CR>");
    expect(app.core.lastArgsFor("threads")["limit"]).toBe(50);
  });

  test(":q clears a search", async () => {
    const app = await AppHarness.started();
    await app.press("/is:starred<CR>");
    await app.press(":q<CR>");
    expect(app.core.lastArgsFor("threads")["query"]).toBe("");
  });

  test("the command line shows its mode while typing", async () => {
    const app = await AppHarness.started();
    await app.press(":lab");
    expect(app.status("mode")).toBe("COMMAND");
    expect(app.driver.text('[data-test="command-line"]')).toBe(":lab");
    await app.press("<Esc>");
    expect(app.status("mode")).toBe("LIST");
  });

  test(":label switches to a label by name", async () => {
    const app = await AppHarness.started();
    await app.press(":label receipts<CR>");
    expect(app.core.lastArgsFor("labels")).toEqual({ account: MailFixtures.ADA });
    expect(app.core.lastArgsFor("threads")["label"]).toBe("Label_7");
    expect(app.status("label")).toBe("Receipts");
  });

  test(":label reports an unknown label", async () => {
    const app = await AppHarness.started();
    await app.press(":label Nope<CR>");
    expect(app.status("error")).toBe(`no label named Nope in ${MailFixtures.ADA}`);
  });

  test("gi pressed while :label looks up its label ends in the inbox", async () => {
    const app = await AppHarness.started();
    app.core.holdReplies("labels");
    await app.pressWithoutWaiting(":label Receipts<CR>");
    await app.pressWithoutWaiting("gi");
    app.core.releaseReplies();
    await app.driver.whenIdle();
    expect(app.status("label")).toBe("Inbox");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("INBOX");
  });

  test("a later :label wins over an earlier one still looking up its label", async () => {
    const app = await AppHarness.started();
    app.core.holdReplies("labels");
    await app.pressWithoutWaiting(":label Receipts<CR>");
    await app.pressWithoutWaiting(":label all<CR>");
    app.core.releaseReplies();
    await app.driver.whenIdle();
    expect(app.status("label")).toBe("All Mail");
  });

  test(":account switches by email", async () => {
    const app = await AppHarness.started();
    await app.press(`:account ${MailFixtures.GRACE}<CR>`);
    expect(app.status("account")).toBe(MailFixtures.GRACE);
  });

  test("an unknown command shows an error", async () => {
    const app = await AppHarness.started();
    await app.press(":nope<CR>");
    expect(app.status("error")).toBe("not a command: nope");
  });

  test("ga lists all mail and gi the inbox", async () => {
    const app = await AppHarness.started();
    await app.press("ga");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("ALL");
    await app.press("gi");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("INBOX");
  });

  test("gs lists sent mail", async () => {
    const app = await AppHarness.started();
    await app.press("gs");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("SENT");
    expect(app.status("label")).toBe("Sent");
  });

  test("g! lists spam", async () => {
    const app = await AppHarness.started();
    await app.press("g!");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("SPAM");
    expect(app.status("label")).toBe("Spam");
  });

  test("the next key clears a wrong command error", async () => {
    const app = await AppHarness.started();
    await app.press(":labelz<CR>");
    expect(app.status("error")).toBe("not a command: labelz");
    await app.press("j");
    expect(app.status("error")).toBe("");
  });

  test(":labels opens the label picker", async () => {
    const app = await AppHarness.started();
    await app.press(":labels<CR>");
    expect(app.isVisible('[data-test="label-picker"]')).toBe(true);
  });

  test("escape clears the last error", async () => {
    const app = await AppHarness.started();
    await app.press(":nope<CR><Esc>");
    expect(app.status("error")).toBe("");
  });
});

describe("list actions", () => {
  test("e archives the selected thread and removes its row", async () => {
    const app = await AppHarness.started();
    await app.press("je");
    expect(app.core.lastArgsFor("archive")).toEqual({ account: MailFixtures.ADA, threadIds: ["t-1"] });
    expect(app.selectedThreadId()).toBe("t-2");
  });

  test("# trashes the selected thread", async () => {
    const app = await AppHarness.started();
    await app.press("#");
    expect(app.core.lastArgsFor("trash")).toEqual({ account: MailFixtures.ADA, threadIds: ["t-0"] });
  });

  test("s toggles the star", async () => {
    const app = await AppHarness.started();
    await app.press("s");
    expect(app.core.requestsFor("star")).toHaveLength(1);
    expect(app.driver.text('[data-test~="selected-row"] .row-star')).toBe("★");
    await app.press("s");
    expect(app.core.requestsFor("unstar")).toHaveLength(1);
  });

  test("U toggles unread", async () => {
    const app = await AppHarness.started();
    await app.press("U");
    expect(app.core.requestsFor("mark-read")).toHaveLength(1);
    await app.press("U");
    expect(app.core.requestsFor("mark-unread")).toHaveLength(1);
  });

  test("a failed action shows the error and reloads the list", async () => {
    const app = await AppHarness.started((core) => core.failNext("archive", { kind: "network", message: "offline" }));
    await app.press("e");
    expect(app.status("error")).toBe("archive: network: offline");
    expect(app.core.requestsFor("threads")).toHaveLength(2);
    expect(app.driver.count('[data-thread-id="t-0"]')).toBe(1);
  });
});
