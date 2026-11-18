import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";

const PALETTE = '[data-test="palette"]';

class PaletteHarness {
  static names(): string[] {
    return [...document.querySelectorAll(`${PALETTE} .palette-name`)].map((name) => name.textContent ?? "");
  }

  static selectedName(): string {
    return document.querySelector(`${PALETTE} [aria-selected="true"] .palette-name`)?.textContent ?? "";
  }
}

describe("label palette", () => {
  test("gl opens the label palette in LABELS mode", async () => {
    const app = await AppHarness.started();
    await app.press("gl");
    expect(app.isVisible(PALETTE)).toBe(true);
    expect(app.status("mode")).toBe("LABELS");
  });

  test("lists the inbox and all mail first, then the labels by name", async () => {
    const app = await AppHarness.started();
    await app.press("gl");
    expect(PaletteHarness.names().slice(0, 2)).toEqual(["Inbox", "All Mail"]);
    expect(PaletteHarness.names()).toContain("Receipts");
  });

  test("shows system labels by their readable names", async () => {
    const app = await AppHarness.started();
    await app.press("gl");
    expect(PaletteHarness.names()).toContain("Spam");
    expect(PaletteHarness.names()).not.toContain("SPAM");
  });

  test(":label finds spam by its Gmail id", async () => {
    const app = await AppHarness.started();
    await app.press(":label SPAM<CR>");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("SPAM");
    expect(app.status("label")).toBe("Spam");
  });

  test("the selection starts on the label being shown", async () => {
    const app = await AppHarness.started();
    await app.press("gagl");
    expect(PaletteHarness.selectedName()).toBe("All Mail");
  });

  test("<C-n> then enter shows the next label", async () => {
    const app = await AppHarness.started();
    await app.press("gl<C-n><CR>");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("ALL");
    expect(app.isVisible(PALETTE)).toBe(false);
    expect(app.status("label")).toBe("All Mail");
  });

  test("typing filters the labels by name", async () => {
    const app = await AppHarness.started();
    await app.press("glrec");
    expect(PaletteHarness.names()).toEqual(["Receipts"]);
    await app.press("<CR>");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("Label_7");
  });

  test("escape closes the palette without changing the label", async () => {
    const app = await AppHarness.started();
    await app.press("gl<C-n><Esc>");
    expect(app.isVisible(PALETTE)).toBe(false);
    expect(app.status("label")).toBe("Inbox");
  });
});
