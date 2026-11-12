import type { ErrorReporter } from "./ErrorReporter";
import { ALL_MAIL } from "./LabelDirectory";
import type { MailClient } from "./MailClient";
import type { MailSession } from "./MailSession";
import type { ThreadCommand, ThreadSummary } from "./Protocol";
import type { ThreadList } from "./ThreadList";

export class ThreadActions {
  constructor(
    private readonly mail: MailClient,
    private readonly session: MailSession,
    private readonly list: ThreadList,
    private readonly errors: ErrorReporter,
  ) {}

  archive(summary: ThreadSummary): void {
    this.archiveAll([summary]);
  }

  archiveAll(summaries: ThreadSummary[]): void {
    for (const summary of summaries) this.removeFromInbox(summary);
    this.send("archive", summaries);
  }

  trash(summary: ThreadSummary): void {
    this.trashAll([summary]);
  }

  trashAll(summaries: ThreadSummary[]): void {
    for (const summary of summaries) this.list.remove(summary.id);
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
    return summary.unread ? this.toggleUnread(summary) : summary;
  }

  private removeFromInbox(summary: ThreadSummary): void {
    if (this.session.labelId === ALL_MAIL.id) this.list.update({ ...summary, labels: this.without(summary, "INBOX") });
    else this.list.remove(summary.id);
  }

  private updateAll(summaries: ThreadSummary[]): ThreadSummary[] {
    for (const summary of summaries) this.list.update(summary);
    return summaries;
  }

  private send(command: ThreadCommand, summaries: ThreadSummary[]): void {
    if (summaries.length === 0) return;
    const ids = summaries.map((summary) => summary.id);
    const request = this.mail.modify(command, this.session.account, ids);
    this.errors.run(request, () => this.errors.run(this.session.reload()));
  }

  private without(summary: ThreadSummary, labelId: string): string[] {
    return summary.labels.filter((label) => label !== labelId);
  }
}
