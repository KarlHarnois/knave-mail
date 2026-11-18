import { LineEditor } from "./LineEditor";
import { LineView } from "./LineView";
import { PaletteList } from "./PaletteList";

export type PaletteEntry = {
  readonly name: string;
  readonly keys: string;
  readonly takesArgument: boolean;
  readonly run: () => void;
};

export type PaletteRequest = {
  readonly prompt: string;
  readonly entries: readonly PaletteEntry[];
  readonly runTyped: (text: string) => void;
  readonly isCommand: (text: string) => boolean;
};

const ARGUMENT_SEPARATOR = " ";

export class CommandPalette {
  readonly element: HTMLElement;
  private readonly list: PaletteList;
  private readonly promptElement: HTMLElement;
  private readonly count: HTMLElement;
  private readonly line: LineEditor = new LineEditor();
  private readonly view: LineView;
  private request: PaletteRequest | null = null;
  private matches: readonly PaletteEntry[] = [];
  private selected = 0;

  constructor(private readonly document: Document) {
    this.element = this.create("div", "palette container container-raised");
    this.element.dataset["test"] = "palette";
    this.element.hidden = true;
    this.list = new PaletteList(document);
    this.promptElement = this.create("span", "command-line-prompt");
    this.view = new LineView(document);
    this.count = this.create("span", "command-line-count");
    const prompt = this.create("label", "palette-prompt command-line");
    prompt.append(this.promptElement, this.view.element, this.count);
    this.element.append(this.list.element, prompt);
  }

  get isOpen(): boolean {
    return this.request !== null;
  }

  open(request: PaletteRequest): void {
    this.request = request;
    this.promptElement.textContent = request.prompt;
    this.line.replace("");
    this.element.hidden = false;
    this.refresh();
  }

  close(): void {
    this.request = null;
    this.element.hidden = true;
  }

  press(token: string): void {
    const action = this.actions()[token];
    if (action) action();
    else if (this.closesOnDelete(token)) this.close();
    else if (this.line.press(token)) this.refresh();
  }

  private actions(): Readonly<Record<string, () => void>> {
    const next = () => this.select(this.selected + 1);
    const previous = () => this.select(this.selected - 1);
    return {
      "<Esc>": () => this.close(),
      "<CR>": () => this.accept(),
      "<C-n>": next,
      "<C-j>": next,
      "<Down>": next,
      "<C-p>": previous,
      "<C-k>": previous,
      "<Up>": previous,
    };
  }

  private closesOnDelete(token: string): boolean {
    return (token === "<BS>" || token === "<C-h>") && this.line.text === "";
  }

  private accept(): void {
    const request = this.request;
    const entry = this.matches[this.selected];
    if (request === null) return;
    if (this.hasArgument() || entry === undefined || request.isCommand(this.line.text)) this.runTyped(request);
    else if (entry.takesArgument) this.askArgument(entry);
    else this.run(entry);
  }

  private runTyped(request: PaletteRequest): void {
    const text = this.line.text;
    this.close();
    request.runTyped(text);
  }

  private askArgument(entry: PaletteEntry): void {
    this.line.replace(entry.name + ARGUMENT_SEPARATOR);
    this.refresh();
  }

  private run(entry: PaletteEntry): void {
    this.close();
    entry.run();
  }

  private refresh(): void {
    this.view.show(this.line);
    this.matches = (this.request?.entries ?? []).filter((entry) => this.matchesTyped(entry));
    this.select(0);
  }

  private matchesTyped(entry: PaletteEntry): boolean {
    const typed = this.typedName();
    return this.hasArgument() ? entry.name === typed : entry.name.includes(typed);
  }

  private typedName(): string {
    return (this.line.text.split(ARGUMENT_SEPARATOR)[0] ?? "").toLowerCase();
  }

  private hasArgument(): boolean {
    return this.line.text.includes(ARGUMENT_SEPARATOR);
  }

  private select(index: number): void {
    this.selected = Math.min(Math.max(index, 0), Math.max(this.matches.length - 1, 0));
    this.list.show(this.matches, this.selected, this.typedName());
    this.count.textContent = this.countText();
  }

  private countText(): string {
    const position = this.matches.length === 0 ? 0 : this.selected + 1;
    return `${position}/${this.matches.length}`;
  }

  private create(tag: string, className: string): HTMLElement {
    const element = this.document.createElement(tag);
    element.className = className;
    return element;
  }
}
