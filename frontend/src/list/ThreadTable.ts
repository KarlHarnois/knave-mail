const HEADER: readonly (readonly [string, string])[] = [
  ["From", "row-from"],
  ["Subject", "row-subject"],
  ["Date", "row-date table-number"],
];

export class ThreadTable {
  readonly element: HTMLElement;
  readonly body: HTMLElement;

  constructor(private readonly document: Document) {
    this.element = document.createElement("table");
    this.element.className = "table thread-table";
    this.element.setAttribute("role", "grid");
    const head = document.createElement("thead");
    head.append(this.headerRow());
    this.body = document.createElement("tbody");
    this.body.className = "thread-list-spacer";
    this.element.append(head, this.body);
  }

  private headerRow(): HTMLElement {
    const row = this.document.createElement("tr");
    for (const [label, className] of HEADER) row.append(this.headerCell(label, className));
    return row;
  }

  private headerCell(label: string, className: string): HTMLElement {
    const cell = this.document.createElement("th");
    cell.className = className;
    cell.textContent = label;
    if (className.includes("table-number")) cell.setAttribute("aria-sort", "descending");
    return cell;
  }
}
