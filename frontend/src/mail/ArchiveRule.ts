import type { ThreadSummary } from "../bridge/Protocol";

const LABELS_OUTSIDE_THE_ARCHIVE = new Set(["INBOX", "TRASH", "SPAM"]);

export class ArchiveRule {
  isArchived(summary: ThreadSummary): boolean {
    return !summary.labels.some((label) => LABELS_OUTSIDE_THE_ARCHIVE.has(label));
  }

  allArchived(summaries: readonly ThreadSummary[]): boolean {
    return summaries.length > 0 && summaries.every((summary) => this.isArchived(summary));
  }
}
