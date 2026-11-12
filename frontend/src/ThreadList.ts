import { ListCursor } from "./ListCursor";
import type { ListWindow, RowRange } from "./ListWindow";
import type { ThreadSummary } from "./Protocol";
import type { RenderScheduler } from "./RenderScheduler";
import type { ThreadRowRenderer } from "./ThreadRowRenderer";

const FALLBACK_VIEWPORT_ROWS = 30;

export class ThreadList {
  readonly element: HTMLElement;
  private readonly spacer: HTMLElement;
  private readonly emptyNotice: HTMLElement;
  private readonly cursor = new ListCursor();
  private readonly rowsByIndex = new Map<number, HTMLElement>();
  private readonly spareRows: HTMLElement[] = [];
  private readonly staleThreadIds = new Set<string>();
  private summaries: ThreadSummary[] = [];
  private everyRowStale = false;
  private scrollTop = 0;
  private viewportHeight: number;
  private readonly renderTask = () => this.render();

  constructor(
    document: Document,
    private readonly listWindow: ListWindow,
    private readonly rows: ThreadRowRenderer,
    private readonly scheduler: RenderScheduler,
  ) {
    this.viewportHeight = FALLBACK_VIEWPORT_ROWS * listWindow.rowHeight;
    this.element = this.createViewport(document);
    this.spacer = this.appendChild(document, "thread-list-spacer");
    this.emptyNotice = this.appendChild(document, "thread-list-empty");
    this.emptyNotice.textContent = "No threads";
    this.emptyNotice.dataset.test = "empty-list";
    this.observeViewport();
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
    this.staleThreadIds.add(summary.id);
    this.scheduleRender();
  }

  remove(threadId: string): void {
    this.summaries = this.summaries.filter((summary) => summary.id !== threadId);
    this.cursor.resize(this.summaries.length);
    this.moveTo(this.cursor.index);
  }

  moveBy(delta: number): void {
    this.moveTo(this.cursor.index + delta);
  }

  moveTo(index: number): void {
    this.cursor.moveTo(index);
    this.revealCursor();
    this.scheduleRender();
  }

  moveToFirst(): void {
    this.moveTo(0);
  }

  moveToLast(): void {
    this.moveTo(this.summaries.length - 1);
  }

  halfPageDown(): void {
    this.moveBy(this.halfPage());
  }

  halfPageUp(): void {
    this.moveBy(-this.halfPage());
  }

  render(): void {
    const range = this.listWindow.visibleRange(this.summaries.length, this.scrollTop, this.viewportHeight);
    this.spacer.style.height = `${this.listWindow.contentHeight(this.summaries.length)}px`;
    this.element.dataset.threadCount = String(this.summaries.length);
    this.emptyNotice.hidden = this.summaries.length > 0;
    this.recycleRowsOutside(range);
    for (let index = range.start; index < range.end; index++) this.renderRow(index);
    this.staleThreadIds.clear();
    this.everyRowStale = false;
  }

  private renderRow(index: number): void {
    const summary = this.summaries[index];
    if (!summary) return;
    const row = this.rowsByIndex.get(index) ?? this.attachRow(index);
    if (this.needsFill(row, summary)) this.rows.fill(row, summary);
    this.rows.markSelected(row, index === this.cursor.index, this.cursor.isSelecting && this.cursor.isChosen(index));
  }

  private replaceSummaries(summaries: ThreadSummary[]): void {
    this.summaries = summaries;
    this.everyRowStale = true;
    this.cursor.resize(summaries.length);
  }

  private needsFill(row: HTMLElement, summary: ThreadSummary): boolean {
    return this.everyRowStale || row.dataset.threadId !== summary.id || this.staleThreadIds.has(summary.id);
  }

  private attachRow(index: number): HTMLElement {
    const row = this.spareRows.pop() ?? this.rows.create();
    this.element.append(row);
    row.style.transform = `translateY(${this.listWindow.offsetOf(index)}px)`;
    this.rowsByIndex.set(index, row);
    return row;
  }

  private recycleRowsOutside(range: RowRange): void {
    for (const [index, row] of this.rowsByIndex) {
      if (index >= range.start && index < range.end) continue;
      row.remove();
      this.rowsByIndex.delete(index);
      this.spareRows.push(row);
    }
  }

  private revealCursor(): void {
    const target = this.listWindow.scrollTopToReveal(this.cursor.index, this.scrollTop, this.viewportHeight);
    if (target === this.scrollTop) return;
    this.scrollTop = target;
    this.element.scrollTop = target;
  }

  private halfPage(): number {
    return Math.max(1, Math.floor(this.listWindow.rowsPerPage(this.viewportHeight) / 2));
  }

  private scheduleRender(): void {
    this.scheduler.schedule(this.renderTask);
  }

  private createViewport(document: Document): HTMLElement {
    const viewport = document.createElement("div");
    viewport.className = "thread-list";
    viewport.dataset.test = "thread-list";
    viewport.setAttribute("role", "listbox");
    viewport.tabIndex = -1;
    viewport.style.setProperty("--row-height", `${this.listWindow.rowHeight}px`);
    viewport.addEventListener("scroll", () => this.followScroll(), { passive: true });
    return viewport;
  }

  private followScroll(): void {
    this.scrollTop = this.element.scrollTop;
    this.scheduleRender();
  }

  private observeViewport(): void {
    if (typeof ResizeObserver === "undefined") return;
    new ResizeObserver((entries) => this.resizeViewport(entries[0]?.contentRect.height ?? 0)).observe(this.element);
  }

  private resizeViewport(height: number): void {
    if (height <= 0 || height === this.viewportHeight) return;
    this.viewportHeight = height;
    this.revealCursor();
    this.scheduleRender();
  }

  private appendChild(document: Document, className: string): HTMLElement {
    const child = document.createElement("div");
    child.className = className;
    this.element.append(child);
    return child;
  }
}
