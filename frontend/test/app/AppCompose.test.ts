import { describe, expect, test } from "bun:test";
import type { Draft } from "../../src/bridge/Protocol";
import { AppHarness } from "../support/AppHarness";
import { MailFixtures } from "../support/MailFixtures";

class ComposeHarness {
  static sentDraft(app: AppHarness): Draft {
    return app.core.lastArgsFor("send")["draft"] as Draft;
  }
}

describe("composer", () => {
  test("c opens a blank draft with header lines", async () => {
    const app = await AppHarness.started();
    await app.press("c");
    expect(app.isVisible('[data-test="composer"]')).toBe(true);
    expect(app.status("mode")).toBe("COMPOSE NORMAL");
    expect(app.composerText()).toBe("To: Cc: Subject: ");
  });

  test(":wq parses the headers and sends the draft", async () => {
    const app = await AppHarness.started();
    await app.press("cAbob@example.com, carol@example.com<Esc>3GAHello<Esc>GiBody line<Esc>:wq<CR>");
    expect(app.core.lastArgsFor("send")["account"]).toBe(MailFixtures.ADA);
    expect(ComposeHarness.sentDraft(app)).toEqual({
      to: ["bob@example.com", "carol@example.com"],
      cc: [],
      subject: "Hello",
      body: "Body line",
      replyTo: null,
    });
    expect(app.status("mode")).toBe("LIST");
    expect(app.status("notice")).toBe("sent");
  });

  test(":x sends", async () => {
    const app = await AppHarness.started();
    await app.press("cAbob@example.com<Esc>:x<CR>");
    expect(ComposeHarness.sentDraft(app).to).toEqual(["bob@example.com"]);
  });

  test("ZZ sends", async () => {
    const app = await AppHarness.started();
    await app.press("cAbob@example.com<Esc>ZZ");
    expect(ComposeHarness.sentDraft(app).to).toEqual(["bob@example.com"]);
  });

  test("sending without recipients shows an error and stays", async () => {
    const app = await AppHarness.started();
    await app.press("c:wq<CR>");
    expect(app.core.requestsFor("send")).toHaveLength(0);
    expect(app.status("error")).toContain("To:");
    expect(app.status("mode")).toStartWith("COMPOSE");
  });

  test("a failed send keeps the composer open", async () => {
    const app = await AppHarness.started((core) => core.failNext("send", { kind: "network", message: "offline" }));
    await app.press("cAbob@example.com<Esc>:wq<CR>");
    expect(app.status("error")).toBe("send: network: offline");
    expect(app.isVisible('[data-test="composer"]')).toBe(true);
  });

  test(":q warns when the draft is dirty", async () => {
    const app = await AppHarness.started();
    await app.press("cAbob@example.com<Esc>:q<CR>");
    expect(app.status("error")).toContain(":q!");
    expect(app.isVisible('[data-test="composer"]')).toBe(true);
  });

  test(":q leaves an untouched draft", async () => {
    const app = await AppHarness.started();
    await app.press("c:q<CR>");
    expect(app.status("mode")).toBe("LIST");
  });

  test(":q! discards the draft", async () => {
    const app = await AppHarness.started();
    await app.press("cAbob@example.com<Esc>:q!<CR>");
    expect(app.status("mode")).toBe("LIST");
    await app.press("c");
    expect(app.composerText()).toBe("To: Cc: Subject: ");
  });

  test(":w keeps the draft in memory so c resumes it", async () => {
    const app = await AppHarness.started();
    await app.press("cAbob@example.com<Esc>:w<CR>");
    expect(app.status("notice")).toBe("draft kept");
    await app.press(":q<CR>");
    expect(app.status("mode")).toBe("LIST");
    await app.press("c");
    expect(app.composerText()).toBe("To: bob@example.comCc: Subject: ");
  });

  test("insert mode shows in the status line", async () => {
    const app = await AppHarness.started();
    await app.press("ci");
    expect(app.status("mode")).toBe("COMPOSE INSERT");
  });
});

describe("reply and forward", () => {
  test("r asks for a reply draft to the focused message and prefills the composer", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("r");
    expect(app.core.lastArgsFor("reply-draft")).toEqual({ account: MailFixtures.ADA, messageId: "m-2", all: false });
    expect(app.composerText()).toBe(
      "To: Sender 2 <sender2@example.net>Cc: Subject: Re: Subject 0> Plain body of message 2",
    );
  });

  test("a asks for a reply-all draft", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("a");
    expect(app.core.lastArgsFor("reply-draft")["all"]).toBe(true);
  });

  test("f asks for a forward draft", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("kf");
    expect(app.core.lastArgsFor("forward-draft")).toEqual({ account: MailFixtures.ADA, messageId: "m-1" });
  });

  test("a sent reply carries replyTo", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("r");
    await app.press("ZZ");
    expect(ComposeHarness.sentDraft(app)).toEqual(MailFixtures.replyDraft());
  });

  test("leaving the composer returns to the thread", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("r");
    await app.press(":q<CR>");
    expect(app.status("mode")).toBe("THREAD");
  });
});

describe("text mode", () => {
  test("v shows the focused message in a read-only vim reader", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("v");
    expect(app.driver.count('[data-test="text-reader"]')).toBe(1);
    expect(app.status("mode")).toBe("TEXT NORMAL");
    expect(app.driver.text('[data-test="text-reader"] .cm-content')).toBe("Plain body of message 2second line 2");
  });

  test("the reader is read-only", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("vddxityping<Esc>");
    expect(app.driver.text('[data-test="text-reader"] .cm-content')).toBe("Plain body of message 2second line 2");
  });

  test("escape in normal mode leaves text mode", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("v<Esc>");
    expect(app.driver.count('[data-test="text-reader"]')).toBe(0);
    expect(app.status("mode")).toBe("THREAD");
  });

  test("escape in visual mode only leaves visual mode", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("vv");
    expect(app.status("mode")).toBe("TEXT VISUAL");
    await app.press("<Esc>");
    expect(app.driver.count('[data-test="text-reader"]')).toBe(1);
  });

  test(":q leaves text mode", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("v:q<CR>");
    expect(app.driver.count('[data-test="text-reader"]')).toBe(0);
  });

  test("a yank in the reader pastes in the composer", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("vjyy<Esc>c");
    await app.press("Gp");
    expect(app.composerText()).toBe("To: Cc: Subject: second line 2");
  });

  test("a visual yank reaches the system clipboard", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press("vwve y");
    expect(await navigator.clipboard.readText()).toBe("body ");
  });

  test("a yank into the + register reaches the system clipboard", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press('vj"+yy');
    expect(await navigator.clipboard.readText()).toBe("second line 2\n");
  });
});
