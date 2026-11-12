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
