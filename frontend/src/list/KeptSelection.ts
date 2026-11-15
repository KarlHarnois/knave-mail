import type { ThreadSummary } from "../bridge/Protocol";
import type { ListCursor } from "./ListCursor";

export class KeptSelection {
  private constructor(
    private readonly cursorId: string | undefined,
    private readonly anchorId: string | undefined,
  ) {}

  static of(summaries: ThreadSummary[], cursor: ListCursor): KeptSelection {
    const anchorIndex = cursor.anchorIndex;
    const anchorId = anchorIndex === null ? undefined : summaries[anchorIndex]?.id;
    return new KeptSelection(summaries[cursor.index]?.id, anchorId);
  }

  cursorIndexIn(summaries: ThreadSummary[]): number | undefined {
    return KeptSelection.indexOf(summaries, this.cursorId);
  }

  restoreAnchor(summaries: ThreadSummary[], cursor: ListCursor): void {
    if (this.anchorId === undefined) return;
    const anchorIndex = KeptSelection.indexOf(summaries, this.anchorId);
    if (anchorIndex === undefined || this.cursorIndexIn(summaries) === undefined) cursor.endSelection();
    else cursor.anchorAt(anchorIndex);
  }

  private static indexOf(summaries: ThreadSummary[], threadId: string | undefined): number | undefined {
    const index = summaries.findIndex((summary) => summary.id === threadId);
    return index >= 0 ? index : undefined;
  }
}
