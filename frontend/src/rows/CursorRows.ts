const FALLBACK_PAGE_ROWS = 20;
const NO_MATCH = -1;

type CursorRow = { element: HTMLElement; text: string };

export class CursorRows {
  private rows: CursorRow[] = [];
  private cursor = 0;
  private query = "";

  get isSearching(): boolean {
    return this.query.length > 0;
  }

  get index(): number {
    return this.cursor;
  }

  add(element: HTMLElement, text: string): void {
    this.rows.push({ element, text: text.toLowerCase() });
  }

  clear(): void {
    this.rows = [];
    this.cursor = 0;
    this.query = "";
  }

  moveBy(offset: number): void {
    this.moveTo(this.cursor + offset);
  }

  moveTo(index: number): void {
    this.rows[this.cursor]?.element.classList.remove("row-cursor");
    this.cursor = Math.min(Math.max(0, index), this.rows.length - 1);
    const row = this.rows[this.cursor];
    row?.element.classList.add("row-cursor");
    row?.element.scrollIntoView?.({ block: "nearest" });
  }

  moveToLast(): void {
    this.moveTo(this.rows.length - 1);
  }

  pageRows(viewportHeight: number): number {
    const rowHeight = this.rows[0]?.element.offsetHeight ?? 0;
    return rowHeight > 0 ? Math.max(1, Math.floor(viewportHeight / rowHeight)) : FALLBACK_PAGE_ROWS;
  }

  search(query: string): boolean {
    this.query = query.trim().toLowerCase();
    for (const row of this.rows) row.element.classList.toggle("row-match", this.matches(row));
    return this.jump(1, 0);
  }

  clearSearch(): void {
    this.search("");
  }

  jump(direction: number, start: number = this.cursor + direction): boolean {
    const found = this.findFrom(direction, start);
    if (found !== NO_MATCH) this.moveTo(found);
    return found !== NO_MATCH;
  }

  private findFrom(direction: number, start: number): number {
    if (!this.isSearching) return NO_MATCH;
    const count = this.rows.length;
    for (let step = 0; step < count; step++) {
      const index = (((start + step * direction) % count) + count) % count;
      const row = this.rows[index];
      if (row && this.matches(row)) return index;
    }
    return NO_MATCH;
  }

  private matches(row: CursorRow): boolean {
    return this.isSearching && row.text.includes(this.query);
  }
}
