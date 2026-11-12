import { describe, expect, test } from "bun:test";
import { HelpContent } from "../../src/help/HelpContent";
import { AppHarness } from "../support/AppHarness";

const HELP = '[data-test="help-view"]';

describe("help page", () => {
  test("? opens the help page in HELP mode", async () => {
    const app = await AppHarness.started();
    await app.press("?");
    expect(app.isVisible(HELP)).toBe(true);
    expect(app.status("mode")).toBe("HELP");
  });

  test("the help page lists the list keys with their descriptions", async () => {
    const app = await AppHarness.started();
    await app.press("?");
    expect(app.driver.text(HELP)).toContain("Archive (remove from the inbox)");
    expect(app.driver.text(HELP)).toContain("j  <Down>");
  });

  test("q closes the help page and keeps the list where it was", async () => {
    const app = await AppHarness.started();
    await app.press("jj?q");
    expect(app.isVisible(HELP)).toBe(false);
    expect(app.selectedThreadId()).toBe("t-2");
  });

  test("keys on the help page do not reach the list", async () => {
    const app = await AppHarness.started();
    await app.press("?e");
    expect(app.core.requestsFor("archive")).toHaveLength(0);
  });

  test(":help opens the help page from a thread", async () => {
    const app = await AppHarness.started();
    await app.press("l:help<CR>");
    expect(app.isVisible(HELP)).toBe(true);
    await app.press("<Esc>");
    expect(app.status("mode")).toBe("THREAD");
  });
});

describe("help content", () => {
  test("covers every view of the app", () => {
    const titles = new HelpContent().sections().map((section) => section.title);
    expect(titles).toEqual(["Thread list", "Thread", "Text reader (v in a thread)", "Composer", "Command line (:)"]);
  });

  test("describes every bound key", () => {
    const rows = new HelpContent().sections().flatMap((section) => section.rows);
    expect(rows.every((row) => row.description.length > 0)).toBe(true);
  });
});
