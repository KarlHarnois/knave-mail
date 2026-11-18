import type { LineEditor } from "./LineEditor";

export class LineView {
  readonly element: HTMLElement;
  private readonly before: HTMLElement;
  private readonly cursor: HTMLElement;
  private readonly after: HTMLElement;

  constructor(document: Document) {
    this.element = document.createElement("span");
    this.element.className = "command-line-text";
    this.before = document.createElement("span");
    this.cursor = document.createElement("span");
    this.cursor.className = "command-line-cursor";
    this.after = document.createElement("span");
    this.element.append(this.before, this.cursor, this.after);
  }

  show(line: LineEditor): void {
    this.element.classList.toggle("is-selected", line.isAllSelected);
    this.before.textContent = line.beforeCursor;
    this.cursor.textContent = line.underCursor;
    this.after.textContent = line.afterCursor;
  }
}
