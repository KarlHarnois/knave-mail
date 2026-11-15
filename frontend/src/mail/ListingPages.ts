export const THREAD_LIMIT = 1000;
export const SEARCH_PAGE = 50;

export class ListingPages {
  private limit = THREAD_LIMIT;
  private fromGmail = false;
  private listedCount = 0;

  get size(): number {
    return this.limit;
  }

  get fresh(): boolean {
    return this.fromGmail;
  }

  get mayHaveMore(): boolean {
    return !this.fromGmail || this.listedCount >= this.limit;
  }

  startListing(query: string): void {
    this.fromGmail = query !== "";
    this.limit = this.fromGmail ? SEARCH_PAGE : THREAD_LIMIT;
    this.listedCount = 0;
  }

  record(count: number): void {
    this.listedCount = count;
  }

  grow(): void {
    this.limit = (this.fromGmail ? this.limit : this.listedCount) + SEARCH_PAGE;
    this.fromGmail = true;
  }
}
