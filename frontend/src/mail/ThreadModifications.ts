import type { MailClient } from "../bridge/MailClient";
import type { ThreadCommand, ThreadSummary } from "../bridge/Protocol";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { MailSession } from "./MailSession";
import type { PendingChanges } from "./PendingChanges";
import { UndoHistory } from "./UndoHistory";

export type ThreadModificationPorts = {
  mail: MailClient;
  session: MailSession;
  errors: ErrorReporter;
  pending: PendingChanges;
};

export class ThreadModifications {
  private readonly history = new UndoHistory();

  constructor(private readonly ports: ThreadModificationPorts) {}

  apply(command: ThreadCommand, summaries: ThreadSummary[], changed: ThreadSummary[] = summaries): void {
    if (summaries.length === 0) return;
    this.record(command, changed);
    const threadIds = summaries.map((summary) => summary.id);
    this.applyWithoutUndo(command, threadIds);
  }

  applyWithoutUndo(command: ThreadCommand, threadIds: string[]): void {
    const request = this.ports.mail.modify(command, this.ports.session.account, threadIds);
    this.ports.pending.track(command, threadIds, request);
    this.ports.errors.run(request, () => this.ports.errors.run(this.ports.session.reload()));
  }

  undo(): void {
    const reversal = this.history.takeReversal();
    const request = this.ports.mail.modify(reversal.command, reversal.account, reversal.threadIds);
    this.ports.pending.track(reversal.command, reversal.threadIds, request);
    this.ports.errors.run(request.then(() => this.ports.session.reload()));
  }

  private record(command: ThreadCommand, changed: ThreadSummary[]): void {
    const threadIds = changed.map((summary) => summary.id);
    if (threadIds.length > 0) this.history.record({ command, account: this.ports.session.account, threadIds });
  }
}
