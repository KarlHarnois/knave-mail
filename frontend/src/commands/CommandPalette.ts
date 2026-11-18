import { PaletteList } from "./PaletteList";
import { PaletteLoading } from "./PaletteLoading";
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
  private readonly loading: PaletteLoading = new PaletteLoading();
  private matches: readonly PaletteEntry[] = [];
  private selected = 0;

  constructor(document: Document) {
    this.element = document.createElement("div");
    this.element.className = "palette container container-raised";
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
    this.list.name(request.label);
    this.element.hidden = false;
    this.entries = [];
    this.refresh();
    if (Array.isArray(request.entries)) this.fill(request, request.entries, []);
    else
      this.loading.wait(
        request.entries as Promise<readonly PaletteEntry[]>,
        (entries, keysTyped) => this.fill(request, entries, keysTyped),
        (error) => this.failLoading(request, error),
      );
  }

  close(): void {
    const request = this.request;
    this.request = null;
    this.loading.cancel();
    this.element.hidden = true;
    request?.closed?.();
  }

  private fill(request: PaletteRequest, entries: readonly PaletteEntry[], keysTyped: readonly string[]): void {
    if (this.request !== request) return;
    this.entries = entries;
    this.refresh(
      Math.max(
        0,
        entries.findIndex((entry) => entry.isCurrent),
      ),
    );
    for (const token of keysTyped) this.isOpen ? this.press(token) : request.passKey?.(token);
  }

  private failLoading(request: PaletteRequest, error: unknown): void {
    if (this.request === request) this.close();
    request.reportLoadError?.(error);
  }

  press(token: string): void {
    if (this.loading.holds(token)) return;
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
}
