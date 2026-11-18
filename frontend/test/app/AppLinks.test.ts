import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";
import type { FakeCore } from "../support/FakeCore";
import { MailFixtures } from "../support/MailFixtures";

const FRAME = '[data-test="message-html"]';
const FRAME_WAIT_MILLISECONDS = 5;

class LinkHarness {
  static async opened(html: string): Promise<AppHarness> {
    const app = await AppHarness.started((core: FakeCore) => {
      core.thread = { ...MailFixtures.thread(1), messages: [MailFixtures.message(0, { html })] };
    });
    await app.press("l");
    await LinkHarness.frameLoaded();
    return app;
  }

  static async frameLoaded(): Promise<void> {
    while (!LinkHarness.mail()?.querySelector("a")) {
      await new Promise((resolve) => setTimeout(resolve, FRAME_WAIT_MILLISECONDS));
    }
  }

  static mail(): Document | null {
    return document.querySelector<HTMLIFrameElement>(FRAME)?.contentDocument ?? null;
  }

  static click(selector: string, button = 0): MouseEvent {
    const event = new MouseEvent(button === 0 ? "click" : "auxclick", { bubbles: true, cancelable: true, button });
    LinkHarness.mail()?.querySelector(selector)?.dispatchEvent(event);
    return event;
  }

  static openedLinks(app: AppHarness): unknown[] {
    return app.core.requestsFor("open-link").map((request) => request.args["url"]);
  }
}

describe("links in a message", () => {
  test("a clicked link opens in the browser", async () => {
    const app = await LinkHarness.opened('<a href="https://example.com/news">News</a>');
    LinkHarness.click("a");
    expect(LinkHarness.openedLinks(app)).toEqual(["https://example.com/news"]);
  });

  test("a click on text inside a link opens the link", async () => {
    const app = await LinkHarness.opened('<a href="https://example.com/news"><b>News</b></a>');
    LinkHarness.click("b");
    expect(LinkHarness.openedLinks(app)).toEqual(["https://example.com/news"]);
  });

  test("a middle click opens the link too", async () => {
    const app = await LinkHarness.opened('<a href="https://example.com/news">News</a>');
    LinkHarness.click("a", 1);
    expect(LinkHarness.openedLinks(app)).toEqual(["https://example.com/news"]);
  });

  test("a clicked link leaves the message in place", async () => {
    await LinkHarness.opened('<a href="https://example.com/news">News</a>');
    expect(LinkHarness.click("a").defaultPrevented).toBe(true);
  });

  test("a mail link opens nothing", async () => {
    const app = await LinkHarness.opened('<a href="mailto:ada@example.com">Write</a>');
    LinkHarness.click("a");
    expect(LinkHarness.openedLinks(app)).toEqual([]);
  });
});
