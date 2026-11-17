import type { MailClient, ThreadQuery } from "../bridge/MailClient";
import type { ThreadSummary } from "../bridge/Protocol";
import type { ThreadList } from "../list/ThreadList";
import type { StatusLine } from "../status/StatusLine";
import { AccountRoster } from "./AccountRoster";
import { INBOX, type LabelDirectory, type LabelRef } from "./LabelDirectory";
import { GMAIL_PAGE, ListingPages, SEARCH_PAGE, THREAD_LIMIT } from "./ListingPages";
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
  private readonly accounts = new AccountRoster();
  private label: LabelRef = INBOX;
  private query = "";
  private loadGeneration = 0;
  private navigation = 0;
  private loadingMore = false;
  private readonly pages = new ListingPages();
  private readonly accountListeners: AccountListener[] = [];

  constructor(private readonly ports: MailSessionPorts) {}

  get account(): string {
    return this.accounts.current;
  }

  get hasAccount(): boolean {
    return !this.accounts.isEmpty;
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

  async start(preferredAccount = ""): Promise<void> {
    this.accounts.load(await this.ports.mail.accounts());
    await this.enterAccount(this.accounts.startIndex(preferredAccount));
  }

  async selectAccount(search: string): Promise<void> {
    await this.enterAccount(this.accounts.indexMatching(search));
  }

  async cycleAccount(step: number): Promise<void> {
    await this.enterAccount(this.accounts.indexAfter(step));
  }

  async goToLabelNamed(name: string): Promise<void> {
    const navigation = this.startNavigation();
    const label = await this.ports.labels.find(this.account, name);
    if (navigation === this.navigation) await this.goTo(label, "");
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

  removeThread(threadId: string): void {
    this.pages.forget(threadId);
    this.ports.list.remove(threadId);
  }

  async showMore(): Promise<void> {
    if (this.loadingMore || !this.pages.mayHaveMore) return;
    this.loadingMore = true;
    try {
      await this.loadNextPage();
    } finally {
      this.loadingMore = false;
    }
  }

  private async loadNextPage(): Promise<void> {
    const generation = this.loadGeneration;
    const page = await this.ports.mail.threadPage(this.queryOf(GMAIL_PAGE), this.pages.pageToken);
    if (generation !== this.loadGeneration) return;
    this.pages.addPage(page.threads, page.nextPageToken);
    this.ports.list.refresh(this.ports.pending.applyTo(this.pages.listing(), this.label.id));
  }

  private async goTo(label: LabelRef, query: string): Promise<void> {
    this.startNavigation();
    this.label = label;
    this.query = query;
    this.pages.startListing();
    this.showLocation();
    const summaries = await this.fetchThreads();
    if (summaries) this.ports.list.show(summaries);
  }

  private startNavigation(): number {
    return ++this.navigation;
  }

  private async enterAccount(index: number): Promise<void> {
    this.accounts.moveTo(index);
    const account = this.account;
    for (const listener of this.accountListeners) listener(account);
    await this.goTo(INBOX, "");
  }

  private async fetchThreads(): Promise<ThreadSummary[] | null> {
    const generation = ++this.loadGeneration;
    const summaries = await this.ports.mail.threads(this.queryOf(this.query ? SEARCH_PAGE : THREAD_LIMIT));
    if (generation !== this.loadGeneration) return null;
    this.pages.showBase(summaries);
    return this.ports.pending.applyTo(this.pages.listing(), this.label.id);
  }

  private queryOf(limit: number): ThreadQuery {
    return { account: this.account, label: this.label.id, query: this.query, limit };
  }

  private showLocation(): void {
    this.ports.status.showAccount(this.account);
    this.ports.status.showLabel(this.query ? `${this.label.name} /${this.query}` : this.label.name);
  }
}
