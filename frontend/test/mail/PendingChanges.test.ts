import { describe, expect, test } from "bun:test";
import { PendingChanges } from "../../src/mail/PendingChanges";
import { MailFixtures } from "../support/MailFixtures";

class HeldRequest {
  readonly promise: Promise<void>;
  private settle: (succeeded: boolean) => void = () => {};

  constructor() {
    this.promise = new Promise<void>((resolve, reject) => {
      this.settle = (succeeded) => (succeeded ? resolve() : reject(new Error("refused")));
    });
    this.promise.catch(() => undefined);
  }

  async answer(succeeded = true): Promise<void> {
    this.settle(succeeded);
    await this.promise.catch(() => undefined);
  }
}

const inboxIds = (pending: PendingChanges) =>
  pending.applyTo(MailFixtures.summaries(3), "INBOX").map((summary) => summary.id);

describe("pending label changes", () => {
  test("an archive still in flight keeps the thread out of a reloaded inbox", () => {
    const pending = new PendingChanges();
    pending.track("archive", ["t-1"], new HeldRequest().promise);
    expect(inboxIds(pending)).toEqual(["t-0", "t-2"]);
  });

  test("all mail keeps the thread but without its inbox label", () => {
    const pending = new PendingChanges();
    pending.track("archive", ["t-1"], new HeldRequest().promise);
    const thread = pending.applyTo(MailFixtures.summaries(3), "ALL").find((summary) => summary.id === "t-1");
    expect(thread?.labels).not.toContain("INBOX");
  });

  test("a star still in flight shows on a reloaded thread", () => {
    const pending = new PendingChanges();
    pending.track("star", ["t-0"], new HeldRequest().promise);
    expect(pending.applyTo(MailFixtures.summaries(1), "INBOX")[0]?.starred).toBe(true);
  });

  test("once the change is answered the reload shows what the server sent", async () => {
    const pending = new PendingChanges();
    const request = new HeldRequest();
    pending.track("archive", ["t-1"], request.promise);
    await request.answer();
    expect(inboxIds(pending)).toEqual(["t-0", "t-1", "t-2"]);
  });

  test("a refused change stops hiding the thread too", async () => {
    const pending = new PendingChanges();
    const request = new HeldRequest();
    pending.track("archive", ["t-1"], request.promise);
    await request.answer(false);
    expect(inboxIds(pending)).toEqual(["t-0", "t-1", "t-2"]);
  });

  test("threads without a change pass through untouched", () => {
    const pending = new PendingChanges();
    pending.track("archive", ["t-9"], new HeldRequest().promise);
    expect(pending.applyTo(MailFixtures.summaries(2), "Receipts").map((summary) => summary.id)).toEqual(["t-0", "t-1"]);
  });
});
