export type RowRange = { start: number; end: number };

export class ListWindow {
  constructor(
    readonly rowHeight: number,
    private readonly overscanRows: number,
  ) {}

  visibleRange(total: number, scrollTop: number, viewportHeight: number): RowRange {
    const firstVisible = Math.floor(scrollTop / this.rowHeight);
    const visibleCount = Math.ceil(viewportHeight / this.rowHeight) + 1;
    const start = Math.max(0, firstVisible - this.overscanRows);
    const end = Math.min(total, firstVisible + visibleCount + this.overscanRows);
    return { start, end: Math.max(start, end) };
  }

  scrollTopToReveal(index: number, scrollTop: number, viewportHeight: number): number {
    const rowTop = index * this.rowHeight;
    const rowBottom = rowTop + this.rowHeight;
    if (rowTop < scrollTop) return rowTop;
    if (rowBottom > scrollTop + viewportHeight) return Math.max(0, rowBottom - viewportHeight);
    return scrollTop;
  }

  rowsPerPage(viewportHeight: number): number {
    return Math.max(1, Math.floor(viewportHeight / this.rowHeight));
  }

  contentHeight(total: number): number {
    return total * this.rowHeight;
  }

  offsetOf(index: number): number {
    return index * this.rowHeight;
  }
}
