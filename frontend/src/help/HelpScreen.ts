import type { Screen } from "../app/Screen";
import type { ScreenHost } from "../app/ScreenHost";
import { KeyMap } from "../keys/KeyMap";
import { HELP_BINDINGS, type HelpAction } from "./HelpBindings";
import { HelpContent } from "./HelpContent";
import { HelpRows } from "./HelpRows";

export type HelpScreenPorts = {
  document: Document;
  host: ScreenHost;
  askSearch: (submit: (query: string) => void) => void;
  showError: (message: string) => void;
};

type Handler = (count: number) => void;

export class HelpScreen implements Screen {
  readonly keyMode = null;
  readonly element: HTMLElement;
  private readonly rows: HelpRows;
  private readonly keys = new KeyMap<HelpAction>(HELP_BINDINGS);
  private readonly handlers: ReadonlyMap<HelpAction, Handler>;

  constructor(private readonly ports: HelpScreenPorts) {
    this.element = ports.document.createElement("section");
    this.element.className = "help-view";
    this.element.dataset["test"] = "help-view";
    this.element.tabIndex = -1;
    this.rows = new HelpRows(ports.document, new HelpContent().sections());
    this.element.append(this.rows.element);
    this.handlers = this.createHandlers();
  }

  open(): void {
    this.ports.host.push(this);
  }

  modeName(): string {
    return "HELP";
  }

  capturesKeys(): boolean {
    return true;
  }

  pressCaptured(token: string): void {
    const result = this.keys.feed(token);
    if (result.kind === "action") this.handlers.get(result.action)?.(result.count ?? 1);
  }

  perform(): void {}

  focus(): void {
    this.element.focus({ preventScroll: true });
  }

  private createHandlers(): ReadonlyMap<HelpAction, Handler> {
    return new Map<HelpAction, Handler>([
      ["down", (count) => this.rows.moveBy(count)],
      ["up", (count) => this.rows.moveBy(-count)],
      ["top", () => this.rows.moveTo(0)],
      ["bottom", () => this.rows.moveToLast()],
      ["halfPageDown", (count) => this.rows.moveBy(count * this.halfPage())],
      ["halfPageUp", (count) => this.rows.moveBy(-count * this.halfPage())],
      ["pageDown", (count) => this.rows.moveBy(count * this.page())],
      ["pageUp", (count) => this.rows.moveBy(-count * this.page())],
      ["search", () => this.ports.askSearch((query) => this.search(query))],
      ["nextMatch", () => this.jump(1)],
      ["previousMatch", () => this.jump(-1)],
      ["escape", () => this.escape()],
      ["close", () => this.ports.host.back()],
    ]);
  }

  private search(query: string): void {
    if (!this.rows.search(query)) this.ports.showError(`help: no match for ${query}`);
  }

  private jump(direction: number): void {
    if (!this.rows.jump(direction)) this.ports.showError("help: no search to repeat, press / first");
  }

  private escape(): void {
    if (this.rows.isSearching) this.rows.clearSearch();
    else this.ports.host.back();
  }

  private page(): number {
    return this.rows.pageRows(this.element.clientHeight);
  }

  private halfPage(): number {
    return Math.max(1, Math.floor(this.page() / 2));
  }
}
