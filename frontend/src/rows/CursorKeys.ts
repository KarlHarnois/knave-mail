import { KeyMap } from "../keys/KeyMap";
import { CURSOR_BINDINGS, type CursorAction } from "./CursorBindings";
import type { CursorRows } from "./CursorRows";

export type CursorKeysPorts = {
  rows: CursorRows;
  viewportHeight: () => number;
  askSearch: (submit: (query: string) => void) => void;
  showError: (message: string) => void;
  choose: (index: number) => void;
  close: () => void;
};

type Handler = (count: number) => void;

export class CursorKeys {
  private readonly keys: KeyMap<CursorAction>;
  private readonly handlers: ReadonlyMap<CursorAction, Handler>;

  constructor(
    private readonly ports: CursorKeysPorts,
    extraBindings: ReadonlyArray<readonly [string, CursorAction]> = [],
  ) {
    this.keys = new KeyMap<CursorAction>([...CURSOR_BINDINGS, ...extraBindings]);
    this.handlers = new Map<CursorAction, Handler>([...this.movementHandlers(), ...this.searchHandlers()]);
  }

  press(token: string): void {
    const result = this.keys.feed(token);
    if (result.kind === "action") this.handlers.get(result.action)?.(result.count ?? 1);
  }

  private movementHandlers(): [CursorAction, Handler][] {
    const rows = this.ports.rows;
    return [
      ["down", (count) => rows.moveBy(count)],
      ["up", (count) => rows.moveBy(-count)],
      ["top", () => rows.moveTo(0)],
      ["bottom", () => rows.moveToLast()],
      ["halfPageDown", (count) => rows.moveBy(count * this.halfPage())],
      ["halfPageUp", (count) => rows.moveBy(-count * this.halfPage())],
      ["pageDown", (count) => rows.moveBy(count * this.page())],
      ["pageUp", (count) => rows.moveBy(-count * this.page())],
      ["choose", () => this.ports.choose(rows.index)],
      ["close", () => this.ports.close()],
    ];
  }

  private searchHandlers(): [CursorAction, Handler][] {
    return [
      ["search", () => this.ports.askSearch((query) => this.search(query))],
      ["nextMatch", () => this.jump(1)],
      ["previousMatch", () => this.jump(-1)],
      ["escape", () => this.escape()],
    ];
  }

  private search(query: string): void {
    if (!this.ports.rows.search(query)) this.ports.showError(`no match for ${query}`);
  }

  private jump(direction: number): void {
    if (!this.ports.rows.jump(direction)) this.ports.showError("no search to repeat, press / first");
  }

  private escape(): void {
    if (this.ports.rows.isSearching) this.ports.rows.clearSearch();
    else this.ports.close();
  }

  private page(): number {
    return this.ports.rows.pageRows(this.ports.viewportHeight());
  }

  private halfPage(): number {
    return Math.max(1, Math.floor(this.page() / 2));
  }
}
