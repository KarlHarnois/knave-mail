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
    expect(app.driver.text(HELP)).toContain("Archive, or move back to the inbox");
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

describe("help navigation", () => {
  const Cursor = ".help-row.row-cursor";

  class HelpHarness {
    static cursorText(): string {
      return document.querySelector(Cursor)?.textContent ?? "";
    }

    static cursorIndex(): number {
      return [...document.querySelectorAll(".help-row")].findIndex((row) => row.classList.contains("row-cursor"));
    }
  }

  test("the cursor starts on the first row", async () => {
    const app = await AppHarness.started();
    await app.press("?");
    expect(HelpHarness.cursorIndex()).toBe(0);
  });

  test("j and k move the cursor and take a count", async () => {
    const app = await AppHarness.started();
    await app.press("?3jk");
    expect(HelpHarness.cursorIndex()).toBe(2);
  });

  test("G and gg jump to the last and first rows", async () => {
    const app = await AppHarness.started();
    await app.press("?G");
    expect(HelpHarness.cursorIndex()).toBe(document.querySelectorAll(".help-row").length - 1);
    await app.press("gg");
    expect(HelpHarness.cursorIndex()).toBe(0);
  });

  test("/ jumps to the first matching row and marks every match", async () => {
    const app = await AppHarness.started();
    await app.press("?/archive<CR>");
    expect(HelpHarness.cursorText()).toContain("Archive, or move back to the inbox");
    expect(document.querySelectorAll(".help-row.row-match").length).toBeGreaterThan(1);
  });

  test("n and N move between matches", async () => {
    const app = await AppHarness.started();
    await app.press("?/archive<CR>");
    const first = HelpHarness.cursorIndex();
    await app.press("n");
    expect(HelpHarness.cursorIndex()).toBeGreaterThan(first);
    await app.press("N");
    expect(HelpHarness.cursorIndex()).toBe(first);
  });

  test("a search without a match reports it", async () => {
    const app = await AppHarness.started();
    await app.press("?/zebra<CR>");
    expect(app.status("error")).toBe("Pattern not found: zebra");
  });

  test("escape clears a search before it closes the page", async () => {
    const app = await AppHarness.started();
    await app.press("?/archive<CR><Esc>");
    expect(document.querySelectorAll(".help-row.row-match")).toHaveLength(0);
    expect(app.isVisible(HELP)).toBe(true);
    await app.press("<Esc>");
    expect(app.isVisible(HELP)).toBe(false);
  });
});

describe("help content", () => {
  test("covers every view of the app", () => {
    const titles = new HelpContent().sections().map((section) => section.title);
    expect(titles).toEqual([
      "Thread list",
      "Thread",
      "Text reader (v in a thread)",
      "Composer",
      "Command line (:)",
      "Help page",
    ]);
  });

  test("describes every bound key", () => {
    const rows = new HelpContent().sections().flatMap((section) => section.rows);
    expect(rows.every((row) => row.description.length > 0)).toBe(true);
  });
});
