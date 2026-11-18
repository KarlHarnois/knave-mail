import { LineEditor } from "./LineEditor";
import { LineView } from "./LineView";
import { MatchCount } from "./MatchCount";

const DELETE_KEYS: ReadonlySet<string> = new Set(["<BS>", "<C-h>"]);

export class PalettePrompt {
  readonly element: HTMLElement;
  private readonly symbol: HTMLElement;
  private readonly count: HTMLElement;
  private readonly line: LineEditor = new LineEditor();
  private readonly view: LineView;

  constructor(document: Document) {
    this.element = document.createElement("label");
    this.element.className = "palette-prompt command-line";
    this.symbol = document.createElement("span");
    this.symbol.className = "command-line-prompt";
    this.symbol.setAttribute("aria-hidden", "true");
    this.view = new LineView(document);
    this.count = document.createElement("span");
    this.count.className = "command-line-count";
    this.count.setAttribute("aria-live", "polite");
    this.element.append(this.symbol, this.view.element, this.count);
  }

  get text(): string {
    return this.line.text;
  }

  start(symbol: string): void {
    this.symbol.textContent = symbol;
    this.replace("");
  }

  replace(text: string): void {
    this.line.replace(text);
    this.view.show(this.line);
  }

  edit(token: string): boolean {
    const edited = this.line.press(token);
    if (edited) this.view.show(this.line);
    return edited;
  }

  isDeletingPastStart(token: string): boolean {
    return DELETE_KEYS.has(token) && this.line.text === "";
  }

  showCount(selected: number, total: number): void {
    this.count.textContent = new MatchCount(total === 0 ? 0 : selected + 1, total).text();
  }
}
