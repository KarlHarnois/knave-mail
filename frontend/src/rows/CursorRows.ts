import { MatchCount } from "../commands/MatchCount";
import { MatchMarks } from "./MatchMarks";

const FALLBACK_PAGE_ROWS = 20;
const NO_MATCH = -1;

type CursorRow = { element: HTMLElement; searched: readonly HTMLElement[]; text: string };

export class CursorRows {
  private rows: CursorRow[] = [];
  private cursor = 0;
  private query = "";
  private readonly marks = new MatchMarks();

  get isSearching(): boolean {
    return this.query.length > 0;
  }

  get index(): number {
    return this.cursor;
  }

  add(element: HTMLElement, searched: readonly HTMLElement[]): void {
    const text = searched.map((cell) => cell.textContent ?? "").join(" ");
    this.rows.push({ element, searched, text: text.toLowerCase() });
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
    this.rows[this.cursor]?.element.setAttribute("aria-selected", "false");
    this.cursor = Math.min(Math.max(0, index), this.rows.length - 1);
    const row = this.rows[this.cursor];
    row?.element.classList.add("row-cursor");
    row?.element.setAttribute("aria-selected", "true");
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
    for (const row of this.rows) this.showMatch(row);
    return this.jump(1, 0);
  }

  matchCount(query: string): string {
    const lowered = query.trim().toLowerCase();
    const starts = lowered ? this.rows.flatMap((row, index) => (row.text.includes(lowered) ? [index] : [])) : [];
    return MatchCount.of(starts, 0).text();
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

  private showMatch(row: CursorRow): void {
    const matches = this.matches(row);
    row.element.classList.toggle("row-match", matches);
    this.marks.show(row.searched, matches ? this.query : "");
  }

  private matches(row: CursorRow): boolean {
    return this.isSearching && row.text.includes(this.query);
  }
}
