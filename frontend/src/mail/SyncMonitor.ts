import type { MailClient } from "../bridge/MailClient";
import type { CoreEvent, SyncFailedEvent } from "../bridge/Protocol";
import type { DateLabel } from "../render/DateLabel";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { StatusLine } from "../status/StatusLine";
import type { LabelDirectory } from "./LabelDirectory";
import type { MailSession } from "./MailSession";

const SYNCING = "syncing";
const SYNC_FAILED = "sync failed";
const SYNC_PAUSED_BY_GMAIL = "sync paused by Gmail's rate limit";
const MILLISECONDS_PER_MINUTE = 60_000;
const SYNC_EVERY_MINUTES = 5;
const SYNC_EVERY_MILLISECONDS = SYNC_EVERY_MINUTES * MILLISECONDS_PER_MINUTE;
const STALE_AFTER_MILLISECONDS = MILLISECONDS_PER_MINUTE;

export type SyncMonitorPorts = {
  mail: MailClient;
  session: MailSession;
  labels: LabelDirectory;
  status: StatusLine;
  errors: ErrorReporter;
  dates: DateLabel;
  repeat: (run: () => void, everyMilliseconds: number) => void;
  now: () => number;
};

export class SyncMonitor {
  private readonly stateByAccount = new Map<string, string>();
  private readonly startedAt = new Map<string, number>();

  constructor(private readonly ports: SyncMonitorPorts) {}

  sync(): void {
    this.syncAccount(this.ports.session.account);
  }

  startSyncing(): void {
    if (!this.ports.session.hasAccount) return;
    this.syncEveryStaleAccount();
    this.ports.repeat(() => this.syncEveryStaleAccount(), SYNC_EVERY_MILLISECONDS);
    this.ports.session.onAccountChange((account) => this.syncIfStale(account));
  }

  showStateOf(account: string): void {
    this.ports.status.showSync(this.stateByAccount.get(account) ?? "");
  }

  handle(event: CoreEvent): void {
    if (event.event === "synced") this.finishSync(event.account);
    else if (event.event === "sync-progress") this.showProgress(event.account);
    else if (event.event === "sync-failed") this.failSync(event);
  }

  private showProgress(account: string): void {
    if (this.isCurrent(account)) this.ports.errors.run(this.ports.session.reload());
  }

  private finishSync(account: string): void {
    this.ports.labels.forget(account);
    this.record(account, `synced ${this.ports.dates.short(Date.now())}`);
    if (this.isCurrent(account)) this.ports.errors.run(this.ports.session.reload());
  }

  private failSync(event: SyncFailedEvent): void {
    if (event.error.kind === "throttled") this.record(event.account, SYNC_PAUSED_BY_GMAIL);
    else this.reportFailedSync(event);
  }

  private reportFailedSync(event: SyncFailedEvent): void {
    this.record(event.account, SYNC_FAILED);
    if (this.isCurrent(event.account)) this.ports.status.showError(`sync: ${event.error.kind}: ${event.error.message}`);
  }

  private syncEveryStaleAccount(): void {
    this.ports.errors.run(
      this.ports.mail.accounts().then((accounts) => {
        for (const { email } of accounts) this.syncIfStale(email);
      }),
    );
  }

  private syncIfStale(account: string): void {
    const started = this.startedAt.get(account);
    if (started === undefined || this.ports.now() - started >= STALE_AFTER_MILLISECONDS) this.syncAccount(account);
  }

  private syncAccount(account: string): void {
    this.startedAt.set(account, this.ports.now());
    this.record(account, SYNCING);
    this.ports.errors.run(this.ports.mail.sync(account), () => this.record(account, SYNC_FAILED));
  }

  private record(account: string, state: string): void {
    this.stateByAccount.set(account, state);
    if (this.isCurrent(account)) this.ports.status.showSync(state);
  }

  private isCurrent(account: string): boolean {
    return this.ports.session.hasAccount && this.ports.session.account === account;
  }
}
