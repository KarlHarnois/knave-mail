import type { ThreadSummary } from "../bridge/Protocol";

const LABELS_OUTSIDE_THE_ARCHIVE = new Set(["INBOX", "TRASH", "SPAM"]);
const ARCHIVED_TEXT = "archived";

export class ArchivedMarker {
  textFor(summary: ThreadSummary): string {
    return this.isArchived(summary) ? ARCHIVED_TEXT : "";
  }

  private isArchived(summary: ThreadSummary): boolean {
    return !summary.labels.some((label) => LABELS_OUTSIDE_THE_ARCHIVE.has(label));
  }
}
