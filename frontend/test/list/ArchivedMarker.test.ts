import { describe, expect, test } from "bun:test";
import type { ThreadSummary } from "../../src/bridge/Protocol";
import { ArchivedMarker } from "../../src/list/ArchivedMarker";
import { MailFixtures } from "../support/MailFixtures";

class MarkerFixture {
  static withLabels(labels: string[]): ThreadSummary {
    return { ...MailFixtures.summaries(1)[0], labels } as ThreadSummary;
  }
}

describe("archived marker", () => {
  const marker = new ArchivedMarker();

  test("marks a thread that left the inbox", () => {
    expect(marker.textFor(MarkerFixture.withLabels(["Receipts"]))).toBe("archived");
  });

  test("marks a thread with no labels at all", () => {
    expect(marker.textFor(MarkerFixture.withLabels([]))).toBe("archived");
  });

  test("leaves inbox threads unmarked", () => {
    expect(marker.textFor(MarkerFixture.withLabels(["INBOX", "UNREAD"]))).toBe("");
  });

  test("leaves trash and spam unmarked", () => {
    expect(marker.textFor(MarkerFixture.withLabels(["TRASH"]))).toBe("");
    expect(marker.textFor(MarkerFixture.withLabels(["SPAM"]))).toBe("");
  });
});
