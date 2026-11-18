import { describe, expect, test } from "bun:test";
import { WhichKeyPopup } from "../../src/keys/WhichKeyPopup";

class ShownPopup {
  readonly popup: WhichKeyPopup = new WhichKeyPopup(window);

  async after(pending: string): Promise<ShownPopup> {
    this.popup.update(pending, "list");
    await new Promise((resolve) => setTimeout(resolve, 0));
    return this;
  }

  keys(): string[] {
    return [...this.popup.element.querySelectorAll("kbd")].map((key) => key.textContent ?? "");
  }
}

describe("which-key popup", () => {
  test("lists the keys that can follow a prefix, without the prefix", async () => {
    const shown = await new ShownPopup().after("g");
    expect(shown.popup.element.hidden).toBe(false);
    expect(shown.keys()).toEqual(expect.arrayContaining(["i", "a", "s", "!", "l", "g"]));
  });

  test("describes each continuation", async () => {
    const shown = await new ShownPopup().after("g");
    expect(shown.popup.element.textContent).toContain("Go to the inbox");
  });

  test("ignores a count typed before the prefix", async () => {
    expect((await new ShownPopup().after("3g")).keys()).toContain("g");
  });

  test("stays hidden with nothing pending", async () => {
    expect((await new ShownPopup().after("")).popup.element.hidden).toBe(true);
  });
});
