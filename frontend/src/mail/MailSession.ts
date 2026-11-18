import type { MailClient, ThreadQuery } from "../bridge/MailClient";
import type { ThreadSummary } from "../bridge/Protocol";
import type { ThreadList } from "../list/ThreadList";
import type { StatusLine } from "../status/StatusLine";
import { AccountRoster } from "./AccountRoster";
import { INBOX, type LabelDirectory, type LabelRef } from "./LabelDirectory";
import { GMAIL_PAGE, ListingPages, SEARCH_PAGE, THREAD_LIMIT } from "./ListingPages";
import { LocationStatus } from "./LocationStatus";
import { PagingGate } from "./PagingGate";
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
  private readonly pages = new ListingPages();
  private readonly paging = new PagingGate();
  private readonly accountListeners: AccountListener[] = [];
  private readonly location: LocationStatus;

  constructor(private readonly ports: MailSessionPorts) {
    this.location = new LocationStatus(ports);
  }

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
    const navigation = ++this.navigation;
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
    await this.location.showCount(this.account, this.label, this.query);
  }

  removeThread(threadId: string): void {
    this.pages.forget(threadId);
    this.ports.list.remove(threadId);
  }

  async showMore(): Promise<void> {
    if (this.pages.mayHaveMore) await this.paging.load(() => this.loadNextPage());
  }

  private async loadNextPage(): Promise<void> {
    const generation = this.loadGeneration;
    const token = this.pages.pageToken;
    const page = await this.ports.mail.threadPage(this.queryOf(GMAIL_PAGE), token);
    if (generation !== this.loadGeneration) return;
    const addsRows = this.pages.addsRows(page.threads);
    this.pages.addPage(page.threads, page.nextPageToken);
    if (!addsRows && this.pages.hasPageAfter(token)) return await this.loadNextPage();
    this.ports.list.refresh(this.ports.pending.applyTo(this.pages.listing(), this.label.id));
    await this.location.showCount(this.account, this.label, this.query);
  }

  private async goTo(label: LabelRef, query: string): Promise<void> {
    ++this.navigation;
    this.label = label;
    this.query = query;
    this.pages.startListing();
    this.location.showWhere(this.account, this.label, this.query);
    const summaries = await this.fetchThreads();
    if (summaries) this.ports.list.show(summaries);
    await this.location.showCount(this.account, this.label, this.query);
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
}
