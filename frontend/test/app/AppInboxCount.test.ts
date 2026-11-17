import { describe, expect, test } from "bun:test";
import { AppHarness } from "../support/AppHarness";

const DEEP_INBOX = [{ id: "INBOX", name: "INBOX", unread: 2, total: 1240 }];

describe("inbox count", () => {
  test("the inbox shows how many of Gmail's threads the list holds", async () => {
    const app = await AppHarness.started((core) => core.answerWith("labels", () => DEEP_INBOX));
    expect(app.status("label")).toBe("Inbox 50 of 1240");
  });

  test("a list that holds every thread shows the plain name", async () => {
    const app = await AppHarness.started();
    expect(app.status("label")).toBe("Inbox");
  });

  test("a search shows its query instead of a count", async () => {
    const app = await AppHarness.started((core) => core.answerWith("labels", () => DEEP_INBOX));
    await app.press("/from:bob<CR>");
    expect(app.status("label")).toBe("Inbox /from:bob");
  });
});
