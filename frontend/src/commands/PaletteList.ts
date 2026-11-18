import { MatchMarks } from "../rows/MatchMarks";
import type { PaletteEntry } from "./CommandPalette";

export class PaletteList {
  readonly element: HTMLElement;
  private readonly marks: MatchMarks = new MatchMarks();

  constructor(private readonly document: Document) {
    this.element = this.create("ul", "palette-list list");
    this.element.setAttribute("role", "listbox");
  }

  name(label: string): void {
    this.element.setAttribute("aria-label", label);
  }

  show(entries: readonly PaletteEntry[], selected: number, typed: string): void {
    this.element.replaceChildren(...entries.map((entry, position) => this.row(entry, position === selected, typed)));
    this.element.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
  }

  private row(entry: PaletteEntry, selected: boolean, typed: string): HTMLElement {
    const item = this.create("li", "list-item palette-row");
    item.dataset["test"] = "palette-row";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(selected));
    const name = this.create("span", "palette-name");
    name.textContent = entry.name;
    this.marks.show([name], typed);
    const keys = this.create("kbd", "palette-keys");
    keys.textContent = entry.keys;
    item.append(name, keys);
    return item;
  }

  private create(tag: string, className: string): HTMLElement {
    const element = this.document.createElement(tag);
    element.className = className;
    return element;
  }
}
