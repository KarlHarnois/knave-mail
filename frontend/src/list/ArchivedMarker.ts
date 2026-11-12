import type { ThreadSummary } from "../bridge/Protocol";
import { ArchiveRule } from "../mail/ArchiveRule";

const ARCHIVED_TEXT = "archived";

export class ArchivedMarker {
  private readonly rule = new ArchiveRule();

  textFor(summary: ThreadSummary): string {
    return this.rule.isArchived(summary) ? ARCHIVED_TEXT : "";
  }
}
