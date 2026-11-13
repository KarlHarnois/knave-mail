export const THREAD_LIMIT = 1000;
export const SEARCH_PAGE = 50;

export class ListingPages {
  private limit = THREAD_LIMIT;
  private searching = false;
  private listedCount = 0;

  get size(): number {
    return this.limit;
  }

  get mayHaveMore(): boolean {
    return this.searching && this.listedCount >= this.limit;
  }

  startListing(query: string): void {
    this.searching = query !== "";
    this.limit = this.searching ? SEARCH_PAGE : THREAD_LIMIT;
    this.listedCount = 0;
  }

  record(count: number): void {
    this.listedCount = count;
  }

  grow(): void {
    this.limit += SEARCH_PAGE;
  }
}
