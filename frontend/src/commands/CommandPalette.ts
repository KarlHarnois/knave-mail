import { PaletteList } from "./PaletteList";
import { PalettePrompt } from "./PalettePrompt";
import { PaletteQuery } from "./PaletteQuery";

import type { PaletteEntry, PaletteRequest } from "./PaletteRequest";

export type { PaletteEntry, PaletteRequest } from "./PaletteRequest";

export class CommandPalette {
  readonly element: HTMLElement;
  private readonly list: PaletteList;
  private readonly prompt: PalettePrompt;
  private request: PaletteRequest | null = null;
  private entries: readonly PaletteEntry[] = [];
  private keysWhileLoading: string[] | null = null;
  private matches: readonly PaletteEntry[] = [];
  private selected = 0;

  constructor(private readonly document: Document) {
    this.element = this.create("div", "palette container container-raised");
    this.element.dataset["test"] = "palette";
    this.element.hidden = true;
    this.list = new PaletteList(document);
    this.prompt = new PalettePrompt(document);
    this.element.append(this.list.element, this.prompt.element);
  }

  get isOpen(): boolean {
    return this.request !== null;
  }

  get modeName(): string {
    return this.request?.mode ?? "";
  }

  open(request: PaletteRequest): void {
    this.request = request;
    this.prompt.start(request.prompt);
    this.element.hidden = false;
    this.entries = [];
    this.refresh();
    if (Array.isArray(request.entries)) this.fill(request, request.entries);
    else this.waitFor(request, request.entries as Promise<readonly PaletteEntry[]>);
  }

  private waitFor(request: PaletteRequest, entries: Promise<readonly PaletteEntry[]>): void {
    this.keysWhileLoading = [];
    entries.then((loaded) => this.fill(request, loaded)).catch(() => this.close());
  }

  private fill(request: PaletteRequest, entries: readonly PaletteEntry[]): void {
    if (this.request !== request) return;
    const waiting = this.keysWhileLoading ?? [];
    this.keysWhileLoading = null;
    this.entries = entries;
    this.refresh(this.currentIndex());
    for (const token of waiting) this.press(token);
  }

  private currentIndex(): number {
    return Math.max(
      0,
      this.entries.findIndex((entry) => entry.isCurrent),
    );
  }

  close(): void {
    this.request = null;
    this.keysWhileLoading = null;
    this.element.hidden = true;
  }

  press(token: string): void {
    if (this.keysWhileLoading) return void this.keysWhileLoading.push(token);
    const action = this.actions()[token];
    if (action) action();
    else if (this.prompt.isDeletingPastStart(token)) this.close();
    else if (this.prompt.edit(token)) this.refresh();
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

  private accept(): void {
    const request = this.request;
    const entry = this.matches[this.selected];
    if (request === null) return;
    if (this.query().hasArgument || entry === undefined) this.runTyped(request);
    else if (entry.takesArgument) this.askArgument(entry);
    else this.run(entry);
  }

  private runTyped(request: PaletteRequest): void {
    const text = this.prompt.text;
    this.close();
    request.runTyped(text);
  }

  private askArgument(entry: PaletteEntry): void {
    this.prompt.replace(PaletteQuery.withArgumentOf(entry));
    this.refresh();
  }

  private run(entry: PaletteEntry): void {
    this.close();
    entry.run();
  }

  private refresh(selected?: number): void {
    const query = this.query();
    this.matches = this.entries.filter((entry) => query.matches(entry));
    this.select(
      selected ??
        Math.max(
          0,
          this.matches.findIndex((entry) => query.names(entry)),
        ),
    );
  }

  private query(): PaletteQuery {
    return new PaletteQuery(this.prompt.text, this.request?.takesArguments ?? false);
  }

  private select(index: number): void {
    this.selected = Math.min(Math.max(index, 0), Math.max(this.matches.length - 1, 0));
    this.list.show(this.matches, this.selected, this.query().name);
    this.prompt.showCount(this.selected, this.matches.length);
  }

  private create(tag: string, className: string): HTMLElement {
    const element = this.document.createElement(tag);
    element.className = className;
    return element;
  }
}
