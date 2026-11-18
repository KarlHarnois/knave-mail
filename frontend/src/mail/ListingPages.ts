import type { ThreadSummary } from "../bridge/Protocol";

export const THREAD_LIMIT = 1000;
export const SEARCH_PAGE = 50;
export const GMAIL_PAGE = 50;

export class ListingPages {
  private base: ThreadSummary[] = [];
  private readonly loaded = new Map<string, ThreadSummary>();
  private nextToken = "";
  private finished = false;
  private gmailTotal = 0;

  get mayHaveMore(): boolean {
    return !this.finished && !this.holdsGmailTotal();
  }

  get pageToken(): string {
    return this.nextToken;
  }

  startListing(): void {
    this.base = [];
    this.loaded.clear();
    this.nextToken = "";
    this.finished = false;
    this.gmailTotal = 0;
  }

  expectTotal(total: number): void {
    this.gmailTotal = total;
  }

  showBase(summaries: ThreadSummary[]): void {
    this.base = summaries;
    this.dropLoadedCoveredByBase();
  }

  forget(threadId: string): void {
    this.base = this.base.filter((summary) => summary.id !== threadId);
    this.loaded.delete(threadId);
  }

  hasPageAfter(token: string): boolean {
    return this.mayHaveMore && this.nextToken !== token;
  }

  addsRows(summaries: readonly ThreadSummary[]): boolean {
    const listed = new Set([...this.base.map((summary) => summary.id), ...this.loaded.keys()]);
    return summaries.some((summary) => !listed.has(summary.id));
  }

  addPage(summaries: readonly ThreadSummary[], nextToken: string): void {
    for (const summary of summaries) this.loaded.set(summary.id, summary);
    this.nextToken = nextToken;
    this.finished = nextToken === "";
  }

  listing(): ThreadSummary[] {
    const listed = new Set(this.base.map((summary) => summary.id));
    const older = [...this.loaded.values()].filter((summary) => !listed.has(summary.id));
    return [...this.base, ...older].sort((left, right) => right.date - left.date);
  }

  private holdsGmailTotal(): boolean {
    return this.gmailTotal > 0 && this.listing().length >= this.gmailTotal;
  }

  private dropLoadedCoveredByBase(): void {
    const oldestBaseDate = this.oldestBaseDate();
    const covered = [...this.loaded.values()].filter((summary) => summary.date >= oldestBaseDate);
    for (const summary of covered) this.loaded.delete(summary.id);
  }

  private oldestBaseDate(): number {
    if (this.base.length === 0) return Number.NEGATIVE_INFINITY;
    return Math.min(...this.base.map((summary) => summary.date));
  }
}
