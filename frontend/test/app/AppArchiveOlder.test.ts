import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";
import { MailFixtures } from "../support/MailFixtures";

describe(":archive-older", () => {
  test("asks the core to archive inbox threads older than the date", async () => {
    const app = await AppHarness.started((core) => core.answerWith("archive-older", () => ({ archived: 412 })));
    await app.press(":archive-older 2026/10/01<CR>");
    expect(app.core.lastArgsFor("archive-older")).toEqual({ account: MailFixtures.ADA, before: "2026/10/01" });
  });

  test("reports how many threads it archived and reloads the list", async () => {
    const app = await AppHarness.started((core) => core.answerWith("archive-older", () => ({ archived: 412 })));
    const listings = app.core.requestsFor("threads").length;
    await app.press(":archive-older 2026/10/01<CR>");
    expect(app.status("notice")).toBe("archived 412 inbox threads older than 2026/10/01");
    expect(app.core.requestsFor("threads").length).toBe(listings + 1);
  });

  test("without a date it shows how to use it", async () => {
    const app = await AppHarness.started();
    await app.press(":archive-older<CR><CR>");
    expect(app.status("error")).toBe("usage: :archive-older <yyyy/mm/dd>");
  });
});
