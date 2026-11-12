import type { DateLabel } from "./DateLabel";
import type { ErrorReporter } from "./ErrorReporter";
import type { LabelDirectory } from "./LabelDirectory";
import type { MailClient } from "./MailClient";
import type { MailSession } from "./MailSession";
import type { CoreEvent, SyncFailedEvent } from "./Protocol";
import type { StatusLine } from "./StatusLine";

const SYNCING = "syncing";
const SYNC_FAILED = "sync failed";

export class SyncMonitor {
  private readonly stateByAccount = new Map<string, string>();

  constructor(
    private readonly mail: MailClient,
    private readonly session: MailSession,
    private readonly labels: LabelDirectory,
    private readonly status: StatusLine,
    private readonly errors: ErrorReporter,
    private readonly dates: DateLabel,
  ) {}

  sync(): void {
    const account = this.session.account;
    this.record(account, SYNCING);
    this.errors.run(this.mail.sync(account), () => this.record(account, SYNC_FAILED));
  }

  showStateOf(account: string): void {
    this.status.showSync(this.stateByAccount.get(account) ?? "");
  }

  handle(event: CoreEvent): void {
    if (event.event === "synced") this.finishSync(event.account);
    else this.failSync(event);
  }

  private finishSync(account: string): void {
    this.labels.forget(account);
    this.record(account, `synced ${this.dates.short(Date.now())}`);
    if (this.isCurrent(account)) this.errors.run(this.session.reload());
  }

  private failSync(event: SyncFailedEvent): void {
    this.record(event.account, SYNC_FAILED);
    if (this.isCurrent(event.account)) this.status.showError(`sync: ${event.error.kind}: ${event.error.message}`);
  }

  private record(account: string, state: string): void {
    this.stateByAccount.set(account, state);
    if (this.isCurrent(account)) this.status.showSync(state);
  }

  private isCurrent(account: string): boolean {
    return this.session.hasAccount && this.session.account === account;
  }
}
