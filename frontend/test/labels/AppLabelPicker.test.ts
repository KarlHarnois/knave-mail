import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";

const PICKER = '[data-test="label-picker"]';
const CURSOR = ".label-row.row-cursor";

class PickerHarness {
  static names(): string[] {
    return [...document.querySelectorAll(".label-row .label-name")].map((name) => name.textContent ?? "");
  }

  static cursorName(): string {
    return document.querySelector(`${CURSOR} .label-name`)?.textContent ?? "";
  }
}

describe("label picker", () => {
  test("gl opens the picker in LABELS mode", async () => {
    const app = await AppHarness.started();
    await app.press("gl");
    expect(app.isVisible(PICKER)).toBe(true);
    expect(app.status("mode")).toBe("LABELS");
  });

  test("lists the inbox and all mail first, then the labels by name", async () => {
    const app = await AppHarness.started();
    await app.press("gl");
    expect(PickerHarness.names().slice(0, 2)).toEqual(["Inbox", "All Mail"]);
    expect(PickerHarness.names()).toContain("Receipts");
  });

  test("shows system labels by their readable names", async () => {
    const app = await AppHarness.started();
    await app.press("gl");
    expect(PickerHarness.names()).toContain("Spam");
    expect(PickerHarness.names()).not.toContain("SPAM");
  });

  test(":label finds spam by its Gmail id", async () => {
    const app = await AppHarness.started();
    await app.press(":label SPAM<CR>");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("SPAM");
    expect(app.status("label")).toBe("Spam");
  });

  test("the cursor starts on the label being shown", async () => {
    const app = await AppHarness.started();
    await app.press("gagl");
    expect(PickerHarness.cursorName()).toBe("All Mail");
  });

  test("enter shows the label under the cursor", async () => {
    const app = await AppHarness.started();
    await app.press("glj<CR>");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("ALL");
    expect(app.isVisible(PICKER)).toBe(false);
    expect(app.status("label")).toBe("All Mail");
  });

  test("/ finds a label by name", async () => {
    const app = await AppHarness.started();
    await app.press("gl/rec<CR>");
    expect(PickerHarness.cursorName()).toBe("Receipts");
    await app.press("l");
    expect(app.core.lastArgsFor("threads")["label"]).toBe("Label_7");
  });

  test("q closes the picker without changing the label", async () => {
    const app = await AppHarness.started();
    await app.press("gljq");
    expect(app.isVisible(PICKER)).toBe(false);
    expect(app.status("label")).toBe("Inbox");
  });
});
