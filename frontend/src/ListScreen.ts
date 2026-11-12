import type { Action, ListAction } from "./KeyBindings";
import type { ThreadSummary } from "./Protocol";
import type { Screen } from "./Screen";
import type { ThreadActions } from "./ThreadActions";
import type { ThreadList } from "./ThreadList";

export type ListScreenPorts = {
  openThread: (summary: ThreadSummary) => void;
  startSearch: () => void;
  clearError: () => void;
};

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
    return new Map<ListAction, Handler>([
      ["moveDown", (count) => this.list.moveBy(count ?? 1)],
      ["moveUp", (count) => this.list.moveBy(-(count ?? 1))],
      ["moveToTop", (count) => this.list.moveTo((count ?? 1) - 1)],
      ["moveToBottom", (count) => (count === null ? this.list.moveToLast() : this.list.moveTo(count - 1))],
      ["halfPageDown", () => this.list.halfPageDown()],
      ["halfPageUp", () => this.list.halfPageUp()],
      ["open", () => this.afterSelection(() => this.withSelected((summary) => this.ports.openThread(summary)))],
      ["search", () => this.afterSelection(() => this.ports.startSearch())],
      ["visualMode", () => this.toggleSelection()],
      ["escape", () => this.escape()],
      ["archive", () => this.withChosen((summaries) => this.actions.archiveAll(summaries))],
      ["trash", () => this.withChosen((summaries) => this.actions.trashAll(summaries))],
      ["toggleStar", () => this.withChosen((summaries) => this.actions.toggleStarAll(summaries))],
      ["toggleUnread", () => this.withChosen((summaries) => this.actions.toggleUnreadAll(summaries))],
      ["moveToInbox", () => this.withChosen((summaries) => this.actions.moveToInboxAll(summaries))],
      ["undo", () => this.afterSelection(() => this.actions.undo())],
    ]);
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
