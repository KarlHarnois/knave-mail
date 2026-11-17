import type { CoreEvent, OperationFailedEvent } from "../bridge/Protocol";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { StatusLine } from "../status/StatusLine";
import type { MailSession } from "./MailSession";

export type OutboxMonitorPorts = {
  session: MailSession;
  status: StatusLine;
  errors: ErrorReporter;
};

export class OutboxMonitor {
  private readonly waitingByAccount = new Map<string, number>();

  constructor(private readonly ports: OutboxMonitorPorts) {}

  handle(event: CoreEvent): void {
    if (event.event === "queue") this.recordWaiting(event.account, event.waiting);
    else if (event.event === "operation-failed") this.reportRefusal(event);
  }

  showStateOf(account: string): void {
    this.ports.status.showWaiting(this.waitingText(this.waitingByAccount.get(account) ?? 0));
  }

  private recordWaiting(account: string, waiting: number): void {
    this.waitingByAccount.set(account, waiting);
    if (this.isCurrent(account)) this.showStateOf(account);
  }

  private reportRefusal(event: OperationFailedEvent): void {
    if (!this.isCurrent(event.account)) return;
    const changes = this.counted(event.threadIds.length, "label change", "label changes");
    this.ports.status.showError(`Gmail refused ${changes}: ${event.error.kind}: ${event.error.message}`);
    this.ports.errors.run(this.ports.session.reload());
  }

  private waitingText(waiting: number): string {
    return waiting === 0 ? "" : `${this.counted(waiting, "change", "changes")} waiting`;
  }

  private counted(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`;
  }

  private isCurrent(account: string): boolean {
    return this.ports.session.hasAccount && this.ports.session.account === account;
  }
}
