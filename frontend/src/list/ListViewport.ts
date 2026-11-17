import type { ListWindow, RowRange, ScreenRows } from "./ListWindow";

const FALLBACK_VIEWPORT_ROWS = 30;

export class ListViewport {
  readonly element: HTMLElement;
  private scrollTop = 0;
  private revealedIndex = 0;
  private readonly fallbackHeight: number;

  constructor(
    document: Document,
    private readonly listWindow: ListWindow,
    private readonly onChange: () => void,
  ) {
    this.fallbackHeight = FALLBACK_VIEWPORT_ROWS * listWindow.rowHeight;
    this.element = this.createElement(document);
    this.observeResizes();
  }

  visibleRange(rowCount: number): RowRange {
    return this.listWindow.visibleRange(rowCount, this.scrollTop, this.height);
  }

  screenRows(rowCount: number): ScreenRows {
    return this.listWindow.screenRows(rowCount, this.scrollTop, this.height);
  }

  reveal(index: number): void {
    this.revealedIndex = index;
    this.scrollTo(this.listWindow.scrollTopToReveal(index, this.scrollTop, this.height));
  }

  fit(rowCount: number): void {
    const lowestScrollTop = this.listWindow.lowestScrollTop(rowCount, this.height);
    if (this.scrollTop > lowestScrollTop) this.scrollTo(lowestScrollTop);
  }

  halfPage(): number {
    return Math.max(1, Math.floor(this.listWindow.rowsPerPage(this.height) / 2));
  }

  private scrollTo(target: number): void {
    if (target === this.scrollTop) return;
    this.scrollTop = target;
    this.element.scrollTop = target;
  }

  private createElement(document: Document): HTMLElement {
    const viewport = document.createElement("div");
    viewport.className = "thread-list";
    viewport.dataset["test"] = "thread-list";
    viewport.setAttribute("role", "listbox");
    viewport.tabIndex = -1;
    viewport.style.setProperty("--row-height", `${this.listWindow.rowHeight}px`);
    viewport.addEventListener("scroll", () => this.followScroll(), { passive: true });
    return viewport;
  }

  private followScroll(): void {
    this.scrollTop = this.element.scrollTop;
    this.onChange();
  }

  private get height(): number {
    return this.element.clientHeight || this.fallbackHeight;
  }

  private observeResizes(): void {
    if (typeof ResizeObserver === "undefined") return;
    new ResizeObserver(() => this.resize()).observe(this.element);
  }

  private resize(): void {
    this.reveal(this.revealedIndex);
    this.onChange();
  }
}
