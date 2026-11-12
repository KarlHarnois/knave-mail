import type { ThreadSummary } from "../bridge/Protocol";
import type { RenderScheduler } from "../render/RenderScheduler";
import { ListCursor } from "./ListCursor";
import { ListPainter } from "./ListPainter";
import { ListViewport } from "./ListViewport";
import type { ListWindow } from "./ListWindow";
import type { ThreadRowRenderer } from "./ThreadRowRenderer";

export type ThreadListParts = {
  document: Document;
  listWindow: ListWindow;
  rows: ThreadRowRenderer;
  scheduler: RenderScheduler;
};

export class ThreadList {
  readonly element: HTMLElement;
  private readonly viewport: ListViewport;
  private readonly painter: ListPainter;
  private readonly cursor = new ListCursor();
  private readonly scheduler: RenderScheduler;
  private readonly renderTask = () => this.render();
  private summaries: ThreadSummary[] = [];

  constructor({ document, listWindow, rows, scheduler }: ThreadListParts) {
    this.scheduler = scheduler;
    this.viewport = new ListViewport(document, listWindow, () => this.scheduleRender());
    this.element = this.viewport.element;
    this.painter = new ListPainter({ document, viewport: this.viewport, listWindow, rows });
  }

  get length(): number {
    return this.summaries.length;
  }

  get selectedIndex(): number {
    return this.cursor.index;
  }

  selected(): ThreadSummary | undefined {
    return this.summaries[this.cursor.index];
  }

  get isSelecting(): boolean {
    return this.cursor.isSelecting;
  }

  startSelection(): void {
    this.cursor.startSelection();
    this.scheduleRender();
  }

  endSelection(): void {
    this.cursor.endSelection();
    this.scheduleRender();
  }

  chosen(): ThreadSummary[] {
    return this.summaries.slice(this.cursor.selectionStart, this.cursor.selectionEnd + 1);
  }

  show(summaries: ThreadSummary[]): void {
    this.replaceSummaries(summaries);
    this.moveToFirst();
  }

  refresh(summaries: ThreadSummary[]): void {
    const selectedId = this.selected()?.id;
    this.replaceSummaries(summaries);
    const keptIndex = summaries.findIndex((summary) => summary.id === selectedId);
    this.moveTo(keptIndex >= 0 ? keptIndex : this.cursor.index);
  }

  update(summary: ThreadSummary): void {
    const index = this.summaries.findIndex((existing) => existing.id === summary.id);
    if (index < 0) return;
    this.summaries[index] = summary;
    this.painter.markStale(summary.id);
    this.scheduleRender();
  }

  remove(threadId: string): void {
    this.refresh(this.summaries.filter((summary) => summary.id !== threadId));
  }

  moveBy(delta: number): void {
    this.moveTo(this.cursor.index + delta);
  }

  moveTo(index: number): void {
    this.cursor.moveTo(index);
    this.viewport.reveal(this.cursor.index);
    this.scheduleRender();
  }

  moveToFirst(): void {
    this.moveTo(0);
  }

  moveToLast(): void {
    this.moveTo(this.summaries.length - 1);
  }

  halfPageDown(): void {
    this.moveBy(this.viewport.halfPage());
  }

  halfPageUp(): void {
    this.moveBy(-this.viewport.halfPage());
  }

  render(): void {
    this.painter.paint(this.summaries, this.cursor);
  }

  private replaceSummaries(summaries: ThreadSummary[]): void {
    this.summaries = summaries;
    this.painter.markAllStale();
    this.cursor.resize(summaries.length);
  }

  private scheduleRender(): void {
    this.scheduler.schedule(this.renderTask);
  }
}
