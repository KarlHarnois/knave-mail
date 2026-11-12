import type { HelpRow, HelpSection } from "./HelpContent";

const FALLBACK_PAGE_ROWS = 20;
const NO_MATCH = -1;

type RenderedRow = { element: HTMLElement; text: string };

export class HelpRows {
  readonly element: HTMLElement;
  private readonly rows: RenderedRow[] = [];
  private cursor = 0;
  private query = "";

  constructor(
    private readonly document: Document,
    sections: readonly HelpSection[],
  ) {
    this.element = document.createElement("div");
    this.element.className = "help-rows";
    this.element.append(...sections.map((section) => this.renderSection(section)));
    this.moveTo(0);
  }

  get isSearching(): boolean {
    return this.query.length > 0;
  }

  moveBy(offset: number): void {
    this.moveTo(this.cursor + offset);
  }

  moveTo(index: number): void {
    this.rows[this.cursor]?.element.classList.remove("help-cursor");
    this.cursor = Math.min(Math.max(0, index), this.rows.length - 1);
    const row = this.rows[this.cursor];
    row?.element.classList.add("help-cursor");
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
    for (const row of this.rows) row.element.classList.toggle("help-match", this.matches(row));
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

  private matches(row: RenderedRow): boolean {
    return this.isSearching && row.text.includes(this.query);
  }

  private renderSection(section: HelpSection): HTMLElement {
    const block = this.document.createElement("section");
    block.className = "help-section";
    const title = this.document.createElement("h2");
    title.textContent = section.title;
    block.append(title, ...section.rows.map((row) => this.renderRow(row)));
    return block;
  }

  private renderRow(row: HelpRow): HTMLElement {
    const element = this.document.createElement("div");
    element.className = "help-row";
    element.dataset["test"] = "help-row";
    element.append(this.cell("help-keys", row.keys), this.cell("help-description", row.description));
    this.rows.push({ element, text: `${row.keys} ${row.description}`.toLowerCase() });
    return element;
  }

  private cell(className: string, text: string): HTMLElement {
    const cell = this.document.createElement("span");
    cell.className = className;
    cell.textContent = text;
    return cell;
  }
}
