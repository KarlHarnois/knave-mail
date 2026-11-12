import type { ListWindow, RowRange } from "./ListWindow";

const FALLBACK_VIEWPORT_ROWS = 30;

export class ListViewport {
  readonly element: HTMLElement;
  private scrollTop = 0;
  private revealedIndex = 0;
  private height: number;

  constructor(
    document: Document,
    private readonly listWindow: ListWindow,
    private readonly onChange: () => void,
  ) {
    this.height = FALLBACK_VIEWPORT_ROWS * listWindow.rowHeight;
    this.element = this.createElement(document);
    this.observeResizes();
  }

  visibleRange(rowCount: number): RowRange {
    return this.listWindow.visibleRange(rowCount, this.scrollTop, this.height);
  }

  reveal(index: number): void {
    this.revealedIndex = index;
    const target = this.listWindow.scrollTopToReveal(index, this.scrollTop, this.height);
    if (target === this.scrollTop) return;
    this.scrollTop = target;
    this.element.scrollTop = target;
  }

  halfPage(): number {
    return Math.max(1, Math.floor(this.listWindow.rowsPerPage(this.height) / 2));
  }

  private createElement(document: Document): HTMLElement {
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
    this.onChange();
  }

  private observeResizes(): void {
    if (typeof ResizeObserver === "undefined") return;
    new ResizeObserver((entries) => this.resize(entries[0]?.contentRect.height ?? 0)).observe(this.element);
  }

  private resize(height: number): void {
    if (height <= 0 || height === this.height) return;
    this.height = height;
    this.reveal(this.revealedIndex);
    this.onChange();
  }
}
