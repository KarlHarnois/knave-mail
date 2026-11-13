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

const KEPT_CHANGES = 100;

export class UndoHistory {
  private readonly reversals: UndoableChange[] = [];

  record(change: UndoableChange): void {
    this.reversals.push({ ...change, command: INVERSE_COMMANDS[change.command] });
    if (this.reversals.length > KEPT_CHANGES) this.reversals.shift();
  }

  takeReversal(): UndoableChange {
    const reversal = this.reversals.pop();
    if (!reversal) throw new Error("nothing to undo");
    return reversal;
  }
}
