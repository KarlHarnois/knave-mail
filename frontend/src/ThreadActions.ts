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
    if (this.session.labelId === ALL_MAIL.id) this.list.update({ ...summary, labels: this.without(summary, "INBOX") });
    else this.list.remove(summary.id);
    this.send("archive", summary);
  }

  trash(summary: ThreadSummary): void {
    this.list.remove(summary.id);
    this.send("trash", summary);
  }

  toggleStar(summary: ThreadSummary): ThreadSummary {
    const updated = { ...summary, starred: !summary.starred };
    this.list.update(updated);
    this.send(updated.starred ? "star" : "unstar", updated);
    return updated;
  }

  toggleUnread(summary: ThreadSummary): ThreadSummary {
    const updated = { ...summary, unread: !summary.unread };
    this.list.update(updated);
    this.send(updated.unread ? "mark-unread" : "mark-read", updated);
    return updated;
  }

  markRead(summary: ThreadSummary): ThreadSummary {
    return summary.unread ? this.toggleUnread(summary) : summary;
  }

  private send(command: ThreadCommand, summary: ThreadSummary): void {
    const request = this.mail.modify(command, this.session.account, [summary.id]);
    this.errors.run(request, () => this.errors.run(this.session.reload()));
  }

  private without(summary: ThreadSummary, labelId: string): string[] {
    return summary.labels.filter((label) => label !== labelId);
  }
}
