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

  static linksTo(count: number): string {
    return Array.from({ length: count }, (_, index) => `<a href="https://example.com/${index}">Link ${index}</a>`).join(
      " ",
    );
  }

  static shownHints(): string[] {
    return [...document.querySelectorAll<HTMLElement>('[data-test="link-hint"]')]
      .filter((hint) => !hint.hidden)
      .map((hint) => hint.textContent ?? "");
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

describe("link hints", () => {
  test("o labels each link on screen", async () => {
    const app = await LinkHarness.opened(LinkHarness.linksTo(3));
    await app.press("o");
    expect(LinkHarness.shownHints()).toEqual(["a", "s", "d"]);
    expect(app.status("mode")).toBe("LINK");
  });

  test("typing a label opens its link", async () => {
    const app = await LinkHarness.opened(LinkHarness.linksTo(3));
    await app.press("os");
    expect(LinkHarness.openedLinks(app)).toEqual(["https://example.com/1"]);
    expect(LinkHarness.shownHints()).toEqual([]);
    expect(app.status("mode")).toBe("THREAD");
  });

  test("more links than hint keys take two letter labels", async () => {
    const app = await LinkHarness.opened(LinkHarness.linksTo(10));
    await app.press("o");
    expect(LinkHarness.shownHints()).toHaveLength(10);
    expect(LinkHarness.shownHints()[9]).toBe("sa");
  });

  test("a first letter keeps only the labels it starts", async () => {
    const app = await LinkHarness.opened(LinkHarness.linksTo(10));
    await app.press("os");
    expect(LinkHarness.shownHints()).toEqual(["sa"]);
    await app.press("a");
    expect(LinkHarness.openedLinks(app)).toEqual(["https://example.com/9"]);
  });

  test("escape clears the labels and opens nothing", async () => {
    const app = await LinkHarness.opened(LinkHarness.linksTo(3));
    await app.press("o<Esc>");
    expect(LinkHarness.shownHints()).toEqual([]);
    expect(LinkHarness.openedLinks(app)).toEqual([]);
    expect(app.status("mode")).toBe("THREAD");
  });

  test("a key that matches no label clears the labels", async () => {
    const app = await LinkHarness.opened(LinkHarness.linksTo(3));
    await app.press("oz");
    expect(LinkHarness.shownHints()).toEqual([]);
    expect(LinkHarness.openedLinks(app)).toEqual([]);
  });

  test("mail links get no label", async () => {
    const app = await LinkHarness.opened(
      '<a href="mailto:ada@example.com">Write</a> <a href="https://example.com/">Site</a>',
    );
    await app.press("o");
    expect(LinkHarness.shownHints()).toEqual(["a"]);
  });
});
