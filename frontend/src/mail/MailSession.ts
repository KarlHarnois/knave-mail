import type { MailClient } from "../bridge/MailClient";
import type { Account, ThreadSummary } from "../bridge/Protocol";
import type { ThreadList } from "../list/ThreadList";
import type { StatusLine } from "../status/StatusLine";
import { INBOX, type LabelDirectory, type LabelRef } from "./LabelDirectory";
import { ListingPages } from "./ListingPages";
import type { PendingChanges } from "./PendingChanges";

export { THREAD_LIMIT } from "./ListingPages";

type AccountListener = (account: string) => void;

export type MailSessionPorts = {
  mail: MailClient;
  list: ThreadList;
  labels: LabelDirectory;
  status: StatusLine;
  pending: PendingChanges;
};

export class MailSession {
  private accounts: Account[] = [];
  private accountIndex = 0;
  private label: LabelRef = INBOX;
  private query = "";
  private loadGeneration = 0;
  private loadingMore = false;
  private readonly pages = new ListingPages();
  private readonly accountListeners: AccountListener[] = [];

  constructor(private readonly ports: MailSessionPorts) {}

  get account(): string {
    const account = this.accounts[this.accountIndex];
    if (!account) throw new Error("no account: add one with `knave-mail accounts add`");
    return account.email;
  }

  get hasAccount(): boolean {
    return this.accounts.length > 0;
  }

  get labelId(): string {
    return this.label.id;
  }

  get isSearching(): boolean {
    return this.query !== "";
  }

  onAccountChange(listener: AccountListener): void {
    this.accountListeners.push(listener);
  }

  async start(): Promise<void> {
    this.accounts = await this.ports.mail.accounts();
    await this.enterAccount(0);
  }

  async selectAccount(search: string): Promise<void> {
    await this.enterAccount(this.indexOfAccount(search));
  }

  async cycleAccount(step: number): Promise<void> {
    const count = this.accounts.length;
    if (count === 0) throw new Error("no account to switch to");
    await this.enterAccount((this.accountIndex + step + count) % count);
  }

  async goToLabelNamed(name: string): Promise<void> {
    await this.goTo(await this.ports.labels.find(this.account, name), "");
  }

  async goToLabel(label: LabelRef): Promise<void> {
    await this.goTo(label, "");
  }

  async search(query: string): Promise<void> {
    await this.goTo(this.label, query.trim());
  }

  async clearSearch(): Promise<void> {
    await this.goTo(this.label, "");
  }

  async reload(): Promise<void> {
    const summaries = await this.fetchThreads();
    if (summaries) this.ports.list.refresh(summaries);
  }

  async showMore(): Promise<void> {
    if (this.loadingMore || !this.pages.mayHaveMore) return;
    this.loadingMore = true;
    this.pages.grow();
    try {
      await this.reload();
    } finally {
      this.loadingMore = false;
    }
  }

  private async goTo(label: LabelRef, query: string): Promise<void> {
    this.label = label;
    this.query = query;
    this.pages.startListing(query);
    this.showLocation();
    const summaries = await this.fetchThreads();
    if (summaries) this.ports.list.show(summaries);
  }

  private async enterAccount(index: number): Promise<void> {
    this.accountIndex = index;
    const account = this.account;
    for (const listener of this.accountListeners) listener(account);
    await this.goTo(INBOX, "");
  }

  private async fetchThreads(): Promise<ThreadSummary[] | null> {
    const generation = ++this.loadGeneration;
    const query = { account: this.account, label: this.label.id, query: this.query, limit: this.pages.size };
    const summaries = await this.ports.mail.threads(query);
    if (generation !== this.loadGeneration) return null;
    this.pages.record(summaries.length);
    return this.ports.pending.applyTo(summaries, this.label.id);
  }

  private indexOfAccount(search: string): number {
    const exact = this.accounts.findIndex((account) => account.email === search);
    if (exact >= 0) return exact;
    const partial = this.accounts.flatMap((account, index) => (account.email.includes(search) ? [index] : []));
    if (partial.length !== 1) throw new Error(`no single account matches ${search}`);
    return partial[0] ?? 0;
  }

  private showLocation(): void {
    this.ports.status.showAccount(this.account);
    this.ports.status.showLabel(this.query ? `${this.label.name} /${this.query}` : this.label.name);
  }
}
