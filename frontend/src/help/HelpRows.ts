import { CursorRows } from "../rows/CursorRows";
import type { HelpRow, HelpSection } from "./HelpContent";

export class HelpRows {
  readonly element: HTMLElement;
  readonly cursor: CursorRows = new CursorRows();

  constructor(
    private readonly document: Document,
    sections: readonly HelpSection[],
  ) {
    this.element = document.createElement("div");
    this.element.className = "help-rows";
    this.element.setAttribute("role", "listbox");
    this.element.append(...sections.map((section) => this.renderSection(section)));
    this.cursor.moveTo(0);
  }

  private renderSection(section: HelpSection): HTMLElement {
    const block = this.document.createElement("section");
    block.className = "help-section";
    block.setAttribute("role", "group");
    block.setAttribute("aria-label", section.title);
    const title = this.document.createElement("h2");
    title.textContent = section.title;
    block.append(title, ...section.rows.map((row) => this.renderRow(row)));
    return block;
  }

  private renderRow(row: HelpRow): HTMLElement {
    const element = this.document.createElement("div");
    element.className = "help-row list-item";
    element.dataset["test"] = "help-row";
    element.setAttribute("role", "option");
    const cells = [this.cell("help-keys", row.keys), this.cell("help-description", row.description)];
    element.append(...cells);
    this.cursor.add(element, cells);
    return element;
  }

  private cell(className: string, text: string): HTMLElement {
    const cell = this.document.createElement("span");
    cell.className = className;
    cell.textContent = text;
    return cell;
  }
}
