import type { Screen } from "../app/Screen";
import type { ThreadSummary } from "../bridge/Protocol";
import type { Action, ListAction } from "../keys/KeyBindings";
import type { ThreadActions } from "../mail/ThreadActions";
import type { ThreadList } from "./ThreadList";

export type ListScreenPorts = {
  openThread: (summary: ThreadSummary) => void;
  startSearch: () => void;
  clearError: () => void;
  nearEnd: () => void;
};

const NEAR_END_ROWS = 10;

type Handler = (count: number | null) => void;

export class ListScreen implements Screen {
  readonly keyMode = "list" as const;
  private readonly handlers: ReadonlyMap<Action, Handler>;

  constructor(
    private readonly list: ThreadList,
    private readonly actions: ThreadActions,
    private readonly ports: ListScreenPorts,
  ) {
    this.handlers = this.createHandlers();
  }

  get element(): HTMLElement {
    return this.list.element;
  }

  modeName(): string {
    return this.list.isSelecting ? "VISUAL" : "LIST";
  }

  capturesKeys(): boolean {
    return false;
  }

  pressCaptured(): void {}

  focus(): void {
    this.list.element.focus({ preventScroll: true });
  }

  perform(action: Action, count: number | null): void {
    this.handlers.get(action)?.(count);
  }

  private createHandlers(): ReadonlyMap<ListAction, Handler> {
    return new Map<ListAction, Handler>([...this.movementHandlers(), ...this.threadHandlers()]);
  }

  private movementHandlers(): [ListAction, Handler][] {
    return [
      ["moveDown", (count) => this.downward(() => this.list.moveBy(count ?? 1))],
      ["moveUp", (count) => this.list.moveBy(-(count ?? 1))],
      ["moveToTop", (count) => this.list.moveTo((count ?? 1) - 1)],
      ["moveToBottom", (count) => this.downward(() => this.moveToRow(count))],
      ["moveToScreenTop", (count) => this.list.moveToScreenTop((count ?? 1) - 1)],
      ["moveToScreenMiddle", () => this.downward(() => this.list.moveToScreenMiddle())],
      ["moveToScreenBottom", (count) => this.downward(() => this.list.moveToScreenBottom((count ?? 1) - 1))],
      ["halfPageDown", () => this.downward(() => this.list.halfPageDown())],
      ["halfPageUp", () => this.list.halfPageUp()],
    ];
  }

  private threadHandlers(): [ListAction, Handler][] {
    return [
      ["open", () => this.afterSelection(() => this.withSelected((summary) => this.ports.openThread(summary)))],
      ["search", () => this.afterSelection(() => this.ports.startSearch())],
      ["visualMode", () => this.toggleSelection()],
      ["escape", () => this.escape()],
      ["archive", () => this.withChosen((summaries) => this.actions.toggleArchiveAll(summaries))],
      ["trash", () => this.withChosen((summaries) => this.actions.trashAll(summaries))],
      ["toggleStar", () => this.withChosen((summaries) => this.actions.toggleStarAll(summaries))],
      ["toggleUnread", () => this.withChosen((summaries) => this.actions.toggleUnreadAll(summaries))],
      ["moveToInbox", () => this.withChosen((summaries) => this.actions.moveToInboxAll(summaries))],
      ["undo", () => this.afterSelection(() => this.actions.undo())],
    ];
  }

  private moveToRow(count: number | null): void {
    if (count === null) this.list.moveToLast();
    else this.list.moveTo(count - 1);
  }

  private downward(move: () => void): void {
    move();
    if (this.list.length - this.list.selectedIndex <= NEAR_END_ROWS) this.ports.nearEnd();
  }

  private toggleSelection(): void {
    if (this.list.isSelecting) this.list.endSelection();
    else this.list.startSelection();
  }

  private escape(): void {
    if (this.list.isSelecting) this.list.endSelection();
    else this.ports.clearError();
  }

  private afterSelection(act: () => void): void {
    this.list.endSelection();
    act();
  }

  private withChosen(act: (summaries: ThreadSummary[]) => void): void {
    const chosen = this.list.chosen();
    this.list.endSelection();
    if (chosen.length > 0) act(chosen);
  }

  private withSelected(act: (summary: ThreadSummary) => void): void {
    const summary = this.list.selected();
    if (summary) act(summary);
  }
}
