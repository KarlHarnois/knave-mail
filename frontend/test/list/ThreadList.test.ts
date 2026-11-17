import { beforeEach, describe, expect, test } from "bun:test";
import { ListWindow } from "../../src/list/ListWindow";
import { ThreadList } from "../../src/list/ThreadList";
import { ThreadRowRenderer } from "../../src/list/ThreadRowRenderer";
import { DateLabel } from "../../src/render/DateLabel";
import { RenderScheduler } from "../../src/render/RenderScheduler";
import { MailFixtures } from "../support/MailFixtures";

const ROW_HEIGHT = 30;
const OVERSCAN = 5;
const FALLBACK_VIEWPORT_ROWS = 30;
const MAX_RENDERED_ROWS = FALLBACK_VIEWPORT_ROWS + 1 + 2 * OVERSCAN;

class BrowserScrolling {
  static clampTo(element: HTMLElement, viewportHeight: number): void {
    let scrolled = 0;
    Object.defineProperty(element, "clientHeight", { value: viewportHeight });
    Object.defineProperty(element, "scrollTop", {
      get: () => scrolled,
      set: (wanted: number) => {
        const spacer = element.querySelector<HTMLElement>(".thread-list-spacer");
        const content = Number.parseFloat(spacer?.style.height ?? "0") || 0;
        scrolled = Math.max(0, Math.min(wanted, content - viewportHeight));
      },
    });
  }
}

class ListFixture {
  readonly scheduler = new RenderScheduler(() => {});
  readonly list = new ThreadList({
    document,
    listWindow: new ListWindow(ROW_HEIGHT, OVERSCAN),
    rows: new ThreadRowRenderer(document, new DateLabel()),
    scheduler: this.scheduler,
  });

  constructor(count: number) {
    document.body.replaceChildren(this.list.element);
    this.list.show(MailFixtures.summaries(count));
    this.scheduler.flush();
  }

  visibleRows(): HTMLElement[] {
    return [...this.list.element.querySelectorAll<HTMLElement>('[data-test~="thread-row"]')];
  }

  selectedRow(): HTMLElement | null {
    return this.list.element.querySelector<HTMLElement>('[data-test~="selected-row"]');
  }

  act(change: (list: ThreadList) => void): void {
    change(this.list);
    this.scheduler.flush();
  }
}

describe("ThreadList windowing", () => {
  let fixture: ListFixture;

  beforeEach(() => {
    fixture = new ListFixture(1000);
  });

  test("renders only the rows in the window for a long list", () => {
    expect(fixture.visibleRows().length).toBeLessThanOrEqual(MAX_RENDERED_ROWS);
    expect(fixture.visibleRows().length).toBeGreaterThan(FALLBACK_VIEWPORT_ROWS);
  });

  test("sizes the spacer for the whole list", () => {
    const spacer = fixture.list.element.querySelector<HTMLElement>(".thread-list-spacer");
    expect(spacer?.style.height).toBe(`${1000 * ROW_HEIGHT}px`);
  });

  test("publishes the thread count", () => {
    expect(fixture.list.element.dataset["threadCount"]).toBe("1000");
  });

  test("marks the first row selected", () => {
    expect(fixture.selectedRow()?.dataset["threadId"]).toBe("t-0");
  });

  test("moving the cursor moves the selected row", () => {
    fixture.act((list) => list.moveBy(5));
    expect(fixture.selectedRow()?.dataset["threadId"]).toBe("t-5");
    expect(fixture.list.element.querySelectorAll('[data-test~="selected-row"]').length).toBe(1);
  });

  test("jumping to the end renders only rows near the end", () => {
    fixture.act((list) => list.moveToLast());
    expect(fixture.selectedRow()?.dataset["threadId"]).toBe("t-999");
    expect(fixture.visibleRows().length).toBeLessThanOrEqual(MAX_RENDERED_ROWS);
    expect(fixture.visibleRows().some((row) => row.dataset["threadId"] === "t-0")).toBe(false);
  });

  test("row elements are reused when the window moves", () => {
    const firstRows = new Set(fixture.visibleRows());
    fixture.act((list) => list.moveToLast());
    expect(fixture.visibleRows().every((row) => firstRows.has(row))).toBe(true);
  });

  test("a row is positioned by its index", () => {
    fixture.act((list) => list.moveTo(40));
    expect(fixture.selectedRow()?.style.transform).toBe(`translateY(${40 * ROW_HEIGHT}px)`);
  });

  test("half page moves by half the viewport", () => {
    fixture.act((list) => list.halfPageDown());
    expect(fixture.list.selectedIndex).toBe(FALLBACK_VIEWPORT_ROWS / 2);
    fixture.act((list) => list.halfPageUp());
    expect(fixture.list.selectedIndex).toBe(0);
  });

  test("rendering is batched until the scheduler flushes", () => {
    fixture.list.moveBy(3);
    expect(fixture.selectedRow()?.dataset["threadId"]).toBe("t-0");
    expect(fixture.scheduler.isPending).toBe(true);
  });
});

describe("ThreadList changes", () => {
  test("updating a summary refills its row", () => {
    const fixture = new ListFixture(10);
    fixture.act((list) => list.update(MailFixtures.summary(0, { starred: true })));
    expect(fixture.selectedRow()?.querySelector(".row-star")?.textContent).toBe("★");
  });

  test("removing the selected thread selects the next one", () => {
    const fixture = new ListFixture(10);
    fixture.act((list) => list.moveTo(4));
    fixture.act((list) => list.remove("t-4"));
    expect(fixture.selectedRow()?.dataset["threadId"]).toBe("t-5");
    expect(fixture.list.length).toBe(9);
  });

  test("shrinking the list while scrolled to its end keeps the screen filled", () => {
    const fixture = new ListFixture(100);
    fixture.act((list) => list.moveToLast());
    fixture.act((list) => list.refresh(MailFixtures.summaries(40)));
    const firstRowOnScreen = 40 - FALLBACK_VIEWPORT_ROWS;
    expect(fixture.visibleRows().some((row) => row.dataset["threadId"] === `t-${firstRowOnScreen}`)).toBe(true);
    expect(fixture.list.element.scrollTop).toBe(firstRowOnScreen * ROW_HEIGHT);
  });

  test("shrinking the list paints every row a taller viewport shows", () => {
    const fixture = new ListFixture(100);
    Object.defineProperty(fixture.list.element, "clientHeight", { value: 40 * ROW_HEIGHT });
    fixture.act((list) => list.moveToLast());
    fixture.act((list) => list.refresh(MailFixtures.summaries(36)));
    expect(fixture.visibleRows().some((row) => row.dataset["threadId"] === "t-0")).toBe(true);
  });

  test("a refresh that moves the selected thread far down scrolls the element there too", () => {
    const fixture = new ListFixture(18);
    BrowserScrolling.clampTo(fixture.list.element, 36 * ROW_HEIGHT);
    fixture.act((list) => list.moveToLast());
    const newer = MailFixtures.summaries(51).slice(18);
    fixture.act((list) => list.refresh([...newer, ...MailFixtures.summaries(18)]));
    expect(fixture.list.selectedIndex).toBe(50);
    expect(fixture.list.element.scrollTop).toBe(51 * ROW_HEIGHT - 36 * ROW_HEIGHT);
  });

  test("removing another thread keeps the selection", () => {
    const fixture = new ListFixture(10);
    fixture.act((list) => list.moveTo(4));
    fixture.act((list) => list.remove("t-2"));
    expect(fixture.selectedRow()?.dataset["threadId"]).toBe("t-4");
  });

  test("refresh keeps the selected thread", () => {
    const fixture = new ListFixture(10);
    fixture.act((list) => list.moveTo(3));
    fixture.act((list) => list.refresh(MailFixtures.summaries(10).slice(2)));
    expect(fixture.selectedRow()?.dataset["threadId"]).toBe("t-3");
  });

  test("refresh keeps the selection on the same threads", () => {
    const fixture = new ListFixture(10);
    fixture.act((list) => list.moveTo(3));
    fixture.act((list) => list.startSelection());
    fixture.act((list) => list.moveBy(1));
    fixture.act((list) => list.refresh([MailFixtures.summary(-1), ...MailFixtures.summaries(10)]));
    expect(fixture.list.chosen().map((summary) => summary.id)).toEqual(["t-3", "t-4"]);
  });

  test("refresh ends the selection when the thread it started on is gone", () => {
    const fixture = new ListFixture(10);
    fixture.act((list) => list.moveTo(3));
    fixture.act((list) => list.startSelection());
    fixture.act((list) => list.moveBy(1));
    fixture.act((list) => list.refresh(MailFixtures.summaries(10).filter((summary) => summary.id !== "t-3")));
    expect(fixture.list.isSelecting).toBe(false);
  });

  test("show resets the cursor to the top", () => {
    const fixture = new ListFixture(10);
    fixture.act((list) => list.moveTo(3));
    fixture.act((list) => list.show(MailFixtures.summaries(5)));
    expect(fixture.list.selectedIndex).toBe(0);
  });

  test("an empty list shows the empty notice", () => {
    const fixture = new ListFixture(0);
    expect(fixture.list.element.querySelector<HTMLElement>('[data-test="empty-list"]')?.hidden).toBe(false);
    expect(fixture.list.selected()).toBeUndefined();
  });

  test("unread threads are marked", () => {
    const fixture = new ListFixture(3);
    expect(fixture.selectedRow()?.classList.contains("unread")).toBe(true);
  });
});

describe("screen-relative moves", () => {
  const selectedId = (fixture: ListFixture) => fixture.selectedRow()?.dataset["threadId"];

  test("H selects the top row on screen, not the first thread", () => {
    const fixture = new ListFixture(100);
    fixture.act((list) => list.moveTo(60));
    fixture.act((list) => list.moveToScreenTop(0));
    expect(selectedId(fixture)).toBe("t-31");
  });

  test("H with a count counts rows down from the top of the screen", () => {
    const fixture = new ListFixture(100);
    fixture.act((list) => list.moveTo(60));
    fixture.act((list) => list.moveToScreenTop(2));
    expect(selectedId(fixture)).toBe("t-33");
  });

  test("L selects the bottom row on screen, not the last thread", () => {
    const fixture = new ListFixture(100);
    fixture.act((list) => list.moveToScreenBottom(0));
    expect(selectedId(fixture)).toBe("t-29");
  });

  test("L with a count counts rows up from the bottom of the screen", () => {
    const fixture = new ListFixture(100);
    fixture.act((list) => list.moveToScreenBottom(2));
    expect(selectedId(fixture)).toBe("t-27");
  });

  test("M selects the middle row on screen", () => {
    const fixture = new ListFixture(100);
    fixture.act((list) => list.moveToScreenMiddle());
    expect(selectedId(fixture)).toBe("t-14");
  });

  test("M in a list shorter than the screen picks the middle thread", () => {
    const fixture = new ListFixture(9);
    fixture.act((list) => list.moveToScreenMiddle());
    expect(selectedId(fixture)).toBe("t-4");
  });

  test("a count larger than the screen stops at its edge", () => {
    const fixture = new ListFixture(100);
    fixture.act((list) => list.moveToScreenTop(99));
    expect(selectedId(fixture)).toBe("t-29");
  });
});

describe("ThreadList trace", () => {
  test("a jump logs the scroll state it painted", () => {
    const traced: string[] = [];
    const scheduler = new RenderScheduler(() => {});
    const list = new ThreadList({
      document,
      listWindow: new ListWindow(ROW_HEIGHT, OVERSCAN),
      rows: new ThreadRowRenderer(document, new DateLabel()),
      scheduler,
      trace: (message) => traced.push(message),
    });
    document.body.replaceChildren(list.element);
    list.show(MailFixtures.summaries(100));
    scheduler.flush();
    list.moveToLast();
    scheduler.flush();
    expect(traced.at(-1)).toBe(
      `list last row: 100 rows, cursor 99, scroll ${100 * ROW_HEIGHT - FALLBACK_VIEWPORT_ROWS * ROW_HEIGHT} (element ${100 * ROW_HEIGHT - FALLBACK_VIEWPORT_ROWS * ROW_HEIGHT}), viewport ${FALLBACK_VIEWPORT_ROWS * ROW_HEIGHT}px, content ${100 * ROW_HEIGHT}px, painting rows 65..100`,
    );
  });
});
