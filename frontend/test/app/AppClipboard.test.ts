import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";

describe("system clipboard", () => {
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

  test("a line deleted in the composer reaches the system clipboard", async () => {
    const app = await AppHarness.started();
    await app.press("cggdd");
    expect(await navigator.clipboard.readText()).toBe("To: \n");
  });

  test("p in the composer pastes what the system clipboard holds", async () => {
    const app = await AppHarness.started();
    await navigator.clipboard.writeText("copied elsewhere");
    await app.press("cGp");
    expect(app.composerText()).toContain("copied elsewhere");
  });

  test("a line copied elsewhere pastes below the cursor line", async () => {
    const app = await AppHarness.started();
    await navigator.clipboard.writeText("a whole line\n");
    await app.press("cggp");
    expect(app.composerText()).toStartWith("To: a whole line");
  });

  test("a named register keeps its own text when the clipboard changes", async () => {
    const app = await AppHarness.started();
    await app.press('cgg"ayy');
    await navigator.clipboard.writeText("copied elsewhere");
    await app.press('G"ap');
    expect(app.composerText()).not.toContain("copied elsewhere");
  });

  test("a yank into the + register reaches the system clipboard", async () => {
    const app = await AppHarness.started();
    await app.press("l");
    await app.press('vj"+yy');
    expect(await navigator.clipboard.readText()).toBe("second line 2\n");
  });
});
