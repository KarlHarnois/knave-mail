import type { ThreadSummary } from "../bridge/Protocol";
import type { ListCursor } from "./ListCursor";
import { ListTrace } from "./ListTrace";
import type { ListViewport } from "./ListViewport";
import type { ListWindow } from "./ListWindow";
import { RowRecycler } from "./RowRecycler";
import type { ThreadRowRenderer } from "./ThreadRowRenderer";
import { ThreadTable } from "./ThreadTable";

export type ListPainterParts = {
  document: Document;
  viewport: ListViewport;
  listWindow: ListWindow;
  rows: ThreadRowRenderer;
  trace: (message: string) => void;
};

export class ListPainter {
  private readonly recycler: RowRecycler;
  private readonly table: ThreadTable;
  private readonly emptyNotice: HTMLElement;
  private readonly staleThreadIds = new Set<string>();
  private everyRowStale = false;
  private readonly tracing: ListTrace;

  constructor(private readonly parts: ListPainterParts) {
    this.table = new ThreadTable(parts.document);
    parts.viewport.element.append(this.table.element);
    this.recycler = new RowRecycler(this.table.body, parts.rows, parts.listWindow);
    this.tracing = new ListTrace(parts.trace);
    this.emptyNotice = this.appendChild("thread-list-empty");
    this.emptyNotice.textContent = "No threads";
    this.emptyNotice.dataset["test"] = "empty-list";
  }

  get trace(): ListTrace {
    return this.tracing;
  }

  markStale(threadId: string): void {
    this.staleThreadIds.add(threadId);
  }

  markAllStale(): void {
    this.everyRowStale = true;
  }

  paint(summaries: readonly ThreadSummary[], cursor: ListCursor): void {
    this.table.body.style.height = `${this.parts.listWindow.contentHeight(summaries.length)}px`;
    this.parts.viewport.fit(summaries.length);
    const range = this.parts.viewport.visibleRange(summaries.length);
    this.parts.viewport.element.dataset["threadCount"] = String(summaries.length);
    this.emptyNotice.hidden = summaries.length > 0;
    this.recycler.recycleOutside(range);
    for (let index = range.start; index < range.end; index++) this.paintRow(summaries, cursor, index);
    this.staleThreadIds.clear();
    this.everyRowStale = false;
    this.trace.afterPaint(
      () => `${summaries.length} rows, cursor ${cursor.index}, ${this.parts.viewport.describe(summaries.length)}`,
    );
  }

  private paintRow(summaries: readonly ThreadSummary[], cursor: ListCursor, index: number): void {
    const summary = summaries[index];
    if (!summary) return;
    const row = this.recycler.rowAt(index);
    if (this.needsFill(row, summary)) this.parts.rows.fill(row, summary);
    this.parts.rows.markSelected(row, index === cursor.index, cursor.isSelecting && cursor.isChosen(index));
  }

  private needsFill(row: HTMLElement, summary: ThreadSummary): boolean {
    return this.everyRowStale || row.dataset["threadId"] !== summary.id || this.staleThreadIds.has(summary.id);
  }

  private appendChild(className: string): HTMLElement {
    const child = this.parts.viewport.element.ownerDocument.createElement("div");
    child.className = className;
    this.parts.viewport.element.append(child);
    return child;
  }
}
