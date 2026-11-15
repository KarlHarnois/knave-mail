import { describe, expect, test } from "bun:test";
import type { ThreadSummary } from "../../src/bridge/Protocol";
import { ListingPages } from "../../src/mail/ListingPages";
import { MailFixtures } from "../support/MailFixtures";

class PagesFixture {
  readonly pages = new ListingPages();

  constructor(base: ThreadSummary[], loaded: ThreadSummary[]) {
    this.pages.startListing();
    this.pages.showBase(base);
    this.pages.addPage(loaded, "next");
  }

  listedIds(): string[] {
    return this.pages.listing().map((summary) => summary.id);
  }
}

const threads = (...indexes: number[]) => indexes.map((index) => MailFixtures.summary(index));

describe("ListingPages", () => {
  test("lists loaded threads after the base, newest first", () => {
    const fixture = new PagesFixture(threads(0, 1), threads(2, 3));
    expect(fixture.listedIds()).toEqual(["t-0", "t-1", "t-2", "t-3"]);
  });

  test("a reloaded base drops loaded threads in the range it covers", () => {
    const fixture = new PagesFixture(threads(0, 1, 2, 3), threads(1, 2, 3, 4));
    fixture.pages.showBase(threads(0, 2, 3));
    expect(fixture.listedIds()).toEqual(["t-0", "t-2", "t-3", "t-4"]);
  });

  test("loaded threads older than the reloaded base stay listed", () => {
    const fixture = new PagesFixture(threads(0, 1), threads(5, 6));
    fixture.pages.showBase(threads(0));
    expect(fixture.listedIds()).toEqual(["t-0", "t-5", "t-6"]);
  });

  test("an empty reloaded base drops every loaded thread", () => {
    const fixture = new PagesFixture(threads(0, 1), threads(5, 6));
    fixture.pages.showBase([]);
    expect(fixture.listedIds()).toEqual([]);
  });

  test("a forgotten thread leaves the listing whether it came from the base or a page", () => {
    const fixture = new PagesFixture(threads(0, 1), threads(5, 6));
    fixture.pages.forget("t-1");
    fixture.pages.forget("t-5");
    expect(fixture.listedIds()).toEqual(["t-0", "t-6"]);
  });
});
