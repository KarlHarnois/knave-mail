import type { MailClient } from "../bridge/MailClient";
import type { ThreadCommand, ThreadSummary } from "../bridge/Protocol";
import type { ThreadList } from "../list/ThreadList";
import type { ErrorReporter } from "../status/ErrorReporter";
import { ArchiveRule } from "./ArchiveRule";
import { INBOX } from "./LabelDirectory";
import type { MailSession } from "./MailSession";
import type { PendingChanges } from "./PendingChanges";
import { UndoHistory } from "./UndoHistory";

export type ThreadActionPorts = {
  mail: MailClient;
  session: MailSession;
  list: ThreadList;
  errors: ErrorReporter;
  pending: PendingChanges;
  notify: (notice: string) => void;
};

export class ThreadActions {
  private readonly history = new UndoHistory();
  private readonly archiveRule = new ArchiveRule();

  constructor(private readonly ports: ThreadActionPorts) {}

  toggleArchive(summary: ThreadSummary): ThreadSummary {
    const archived = this.archiveRule.isArchived(summary);
    const updated = archived ? this.moveToInboxAll([summary]) : this.markArchivedAll([summary]);
    return updated[0] ?? summary;
  }

  dropArchivedFromInbox(summary: ThreadSummary): void {
    if (this.archiveRule.isArchived(summary) && this.isInInboxView()) this.ports.session.removeThread(summary.id);
  }

  toggleArchiveAll(summaries: ThreadSummary[]): void {
    if (this.archiveRule.allArchived(summaries)) this.moveToInboxAll(summaries);
    else this.archiveAll(summaries);
  }

  archiveAll(summaries: ThreadSummary[]): void {
    for (const summary of summaries) this.removeFromInbox(summary);
    this.send("archive", summaries);
    this.ports.notify(`archived ${this.threadCount(summaries)}`);
  }

  moveToInboxAll(summaries: ThreadSummary[]): ThreadSummary[] {
    const updated = this.updateAll(
      summaries.map((summary) => ({ ...summary, labels: [...this.without(summary, INBOX.id), INBOX.id] })),
    );
    this.send("move-to-inbox", updated);
    this.ports.notify(`moved ${this.threadCount(updated)} to the inbox`);
    return updated;
  }

  undo(): void {
    const reversal = this.history.takeReversal();
    const request = this.ports.mail.modify(reversal.command, reversal.account, reversal.threadIds);
    this.ports.pending.track(reversal.command, reversal.threadIds, request);
    this.ports.errors.run(request.then(() => this.ports.session.reload()));
  }

  trash(summary: ThreadSummary): void {
    this.trashAll([summary]);
  }

  trashAll(summaries: ThreadSummary[]): void {
    for (const summary of summaries) this.ports.session.removeThread(summary.id);
    this.send("trash", summaries);
  }

  toggleStar(summary: ThreadSummary): ThreadSummary {
    return this.toggleStarAll([summary])[0] ?? summary;
  }

  toggleStarAll(summaries: ThreadSummary[]): ThreadSummary[] {
    const starred = !summaries.every((summary) => summary.starred);
    const updated = this.updateAll(summaries.map((summary) => ({ ...summary, starred })));
    this.send(starred ? "star" : "unstar", updated);
    return updated;
  }

  toggleUnread(summary: ThreadSummary): ThreadSummary {
    return this.toggleUnreadAll([summary])[0] ?? summary;
  }

  toggleUnreadAll(summaries: ThreadSummary[]): ThreadSummary[] {
    const unread = summaries.every((summary) => !summary.unread);
    const updated = this.updateAll(summaries.map((summary) => ({ ...summary, unread })));
    this.send(unread ? "mark-unread" : "mark-read", updated);
    return updated;
  }

  markRead(summary: ThreadSummary): ThreadSummary {
    if (!summary.unread) return summary;
    const updated = { ...summary, unread: false };
    this.ports.list.update(updated);
    this.request("mark-read", [updated.id]);
    return updated;
  }

  private markArchivedAll(summaries: ThreadSummary[]): ThreadSummary[] {
    const updated = this.updateAll(summaries.map((summary) => this.archivedCopy(summary)));
    this.send("archive", updated);
    this.ports.notify(`archived ${this.threadCount(updated)}`);
    return updated;
  }

  private removeFromInbox(summary: ThreadSummary): void {
    if (this.isInInboxView()) this.ports.session.removeThread(summary.id);
    else this.ports.list.update(this.archivedCopy(summary));
  }

  private isInInboxView(): boolean {
    return this.ports.session.labelId === INBOX.id;
  }

  private archivedCopy(summary: ThreadSummary): ThreadSummary {
    return { ...summary, labels: this.without(summary, INBOX.id) };
  }

  private threadCount(summaries: readonly ThreadSummary[]): string {
    return summaries.length === 1 ? "1 thread" : `${summaries.length} threads`;
  }

  private updateAll(summaries: ThreadSummary[]): ThreadSummary[] {
    for (const summary of summaries) this.ports.list.update(summary);
    return summaries;
  }

  private send(command: ThreadCommand, summaries: ThreadSummary[]): void {
    if (summaries.length === 0) return;
    const threadIds = summaries.map((summary) => summary.id);
    this.history.record({ command, account: this.ports.session.account, threadIds });
    this.request(command, threadIds);
  }

  private request(command: ThreadCommand, threadIds: string[]): void {
    const request = this.ports.mail.modify(command, this.ports.session.account, threadIds);
    this.ports.pending.track(command, threadIds, request);
    this.ports.errors.run(request, () => this.ports.errors.run(this.ports.session.reload()));
  }

  private without(summary: ThreadSummary, labelId: string): string[] {
    return summary.labels.filter((label) => label !== labelId);
  }
}
