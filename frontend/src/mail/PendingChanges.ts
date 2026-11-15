import type { ThreadCommand, ThreadSummary } from "../bridge/Protocol";

type Effect = (summary: ThreadSummary) => ThreadSummary;
type InFlightChange = { command: ThreadCommand; threadIds: ReadonlySet<string> };

const ALL_MAIL_ID = "ALL";
const TRASH_ID = "TRASH";

class Labels {
  static with(summary: ThreadSummary, label: string): string[] {
    return summary.labels.includes(label) ? summary.labels : [...summary.labels, label];
  }

  static without(summary: ThreadSummary, label: string): string[] {
    return summary.labels.filter((existing) => existing !== label);
  }
}

const EFFECTS: Readonly<Record<ThreadCommand, Effect>> = {
  archive: (summary) => ({ ...summary, labels: Labels.without(summary, "INBOX") }),
  "move-to-inbox": (summary) => ({ ...summary, labels: Labels.with(summary, "INBOX") }),
  trash: (summary) => ({
    ...summary,
    labels: Labels.with({ ...summary, labels: Labels.without(summary, "INBOX") }, TRASH_ID),
  }),
  untrash: (summary) => ({ ...summary, labels: Labels.without(summary, TRASH_ID) }),
  star: (summary) => ({ ...summary, starred: true, labels: Labels.with(summary, "STARRED") }),
  unstar: (summary) => ({ ...summary, starred: false, labels: Labels.without(summary, "STARRED") }),
  "mark-read": (summary) => ({ ...summary, unread: false, labels: Labels.without(summary, "UNREAD") }),
  "mark-unread": (summary) => ({ ...summary, unread: true, labels: Labels.with(summary, "UNREAD") }),
};

export class PendingChanges {
  private readonly inFlight: InFlightChange[] = [];

  track(command: ThreadCommand, threadIds: readonly string[], request: Promise<unknown>): void {
    const change = { command, threadIds: new Set(threadIds) };
    this.inFlight.push(change);
    const settle = () => this.forget(change);
    request.then(settle, settle);
  }

  applyTo(summaries: readonly ThreadSummary[], labelId: string): ThreadSummary[] {
    return summaries.flatMap((summary) => {
      if (!this.touches(summary.id)) return [summary];
      const changed = this.applied(summary);
      return this.belongsIn(changed, labelId) ? [changed] : [];
    });
  }

  private applied(summary: ThreadSummary): ThreadSummary {
    return this.inFlight.reduce(
      (current, change) => (change.threadIds.has(current.id) ? EFFECTS[change.command](current) : current),
      summary,
    );
  }

  private touches(threadId: string): boolean {
    return this.inFlight.some((change) => change.threadIds.has(threadId));
  }

  private belongsIn(summary: ThreadSummary, labelId: string): boolean {
    if (labelId === ALL_MAIL_ID) return !summary.labels.includes(TRASH_ID);
    return summary.labels.includes(labelId);
  }

  private forget(change: InFlightChange): void {
    const index = this.inFlight.indexOf(change);
    if (index >= 0) this.inFlight.splice(index, 1);
  }
}
