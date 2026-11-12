import type { Screen } from "../app/Screen";
import type { ScreenHost } from "../app/ScreenHost";
import { HelpContent, type HelpSection } from "./HelpContent";

const LINE_SCROLL_PIXELS = 40;
const CLOSING_KEYS = new Set(["q", "<Esc>", "?"]);

export class HelpScreen implements Screen {
  readonly keyMode = null;
  readonly element: HTMLElement;

  constructor(
    private readonly document: Document,
    private readonly host: ScreenHost,
  ) {
    this.element = document.createElement("section");
    this.element.className = "help-view";
    this.element.dataset["test"] = "help-view";
    this.element.tabIndex = -1;
    this.element.append(...new HelpContent().sections().map((section) => this.renderSection(section)));
  }

  open(): void {
    this.host.push(this);
    this.element.scrollTop = 0;
  }

  modeName(): string {
    return "HELP";
  }

  capturesKeys(): boolean {
    return true;
  }

  pressCaptured(token: string): void {
    if (CLOSING_KEYS.has(token)) this.host.back();
    else this.scrollFor(token);
  }

  perform(): void {}

  focus(): void {
    this.element.focus({ preventScroll: true });
  }

  private scrollFor(token: string): void {
    const halfPage = this.element.clientHeight / 2;
    const offsets = new Map([
      ["j", LINE_SCROLL_PIXELS],
      ["<Down>", LINE_SCROLL_PIXELS],
      ["k", -LINE_SCROLL_PIXELS],
      ["<Up>", -LINE_SCROLL_PIXELS],
      ["<C-d>", halfPage],
      ["<C-u>", -halfPage],
    ]);
    this.element.scrollTop += offsets.get(token) ?? 0;
  }

  private renderSection(section: HelpSection): HTMLElement {
    const block = this.document.createElement("div");
    block.className = "help-section";
    const title = this.document.createElement("h2");
    title.textContent = section.title;
    const table = this.document.createElement("dl");
    for (const row of section.rows) table.append(this.cell("dt", row.keys), this.cell("dd", row.description));
    block.append(title, table);
    return block;
  }

  private cell(tag: "dt" | "dd", text: string): HTMLElement {
    const cell = this.document.createElement(tag);
    cell.textContent = text;
    return cell;
  }
}
