import type { ThreadCommand } from "../bridge/Protocol";

export type UndoableChange = { command: ThreadCommand; account: string; threadIds: string[] };

const INVERSE_COMMANDS: Readonly<Record<ThreadCommand, ThreadCommand>> = {
  archive: "move-to-inbox",
  "move-to-inbox": "archive",
  trash: "untrash",
  untrash: "trash",
  star: "unstar",
  unstar: "star",
  "mark-read": "mark-unread",
  "mark-unread": "mark-read",
};

export class UndoHistory {
  private last: UndoableChange | null = null;

  record(change: UndoableChange): void {
    this.last = { ...change, command: INVERSE_COMMANDS[change.command] };
  }

  takeReversal(): UndoableChange {
    const reversal = this.last;
    if (!reversal) throw new Error("nothing to undo");
    this.last = null;
    return reversal;
  }
}
