import type { ThreadAction } from "../keys/KeyBindings";
import type { ThreadActions } from "../mail/ThreadActions";
import type { ThreadHeader } from "./ThreadHeader";

type Handler = () => void;

export class ThreadTriage {
  constructor(
    private readonly header: ThreadHeader,
    private readonly actions: ThreadActions,
    private readonly close: () => void,
  ) {}

  handlers(): [ThreadAction, Handler][] {
    const actions = this.actions;
    return [
      ["archive", () => this.header.withSummary((summary) => this.header.show(actions.toggleArchive(summary)))],
      ["trash", () => this.header.withSummary((summary) => this.closeAfter(() => actions.trash(summary)))],
      ["toggleStar", () => this.header.withSummary((summary) => this.header.show(actions.toggleStar(summary)))],
      ["toggleUnread", () => this.header.withSummary((summary) => this.header.show(actions.toggleUnread(summary)))],
      ["moveToInbox", () => this.header.withSummary((summary) => actions.moveToInboxAll([summary]))],
      ["undo", () => this.closeAfter(() => actions.undo())],
    ];
  }

  putAway(): void {
    this.header.withSummary((summary) => this.actions.dropArchivedFromInbox(summary));
  }

  private closeAfter(act: () => void): void {
    act();
    this.close();
  }
}
