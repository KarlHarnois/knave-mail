import { describe, expect, test } from "bun:test";
import type { Logger } from "../../src/logging/Logger";
import type { MessageStack } from "../../src/thread/MessageStack";
import { ThreadPager } from "../../src/thread/ThreadPager";

const VIEW_HEIGHT = 600;
const THREAD_HEIGHT = 3000;

class PagerFixture {
  readonly view = document.createElement("section");
  readonly message = document.createElement("article");
  readonly focusedAt: number[] = [];
  readonly logged: string[] = [];

  constructor() {
    Object.defineProperty(this.view, "clientHeight", { value: VIEW_HEIGHT });
    Object.defineProperty(this.view, "scrollHeight", { value: THREAD_HEIGHT });
    this.view.getBoundingClientRect = () => new DOMRect(0, 0, 800, VIEW_HEIGHT);
    this.message.getBoundingClientRect = () => new DOMRect(0, -100, 800, 2000);
  }

  pager(): ThreadPager {
    const messages = {
      focusedElement: () => this.message,
      focusAt: (offset: number) => this.focusedAt.push(offset),
    };
    const logger = { debug: (message: string) => this.logged.push(message) };
    return new ThreadPager(this.view, messages as unknown as MessageStack, logger as unknown as Logger);
  }
}

describe("thread pager", () => {
  test("j scrolls a line per count", () => {
    const fixture = new PagerFixture();
    fixture.pager().down(2);
    expect(fixture.view.scrollTop).toBe(120);
  });

  test("k scrolls back up a line per count", () => {
    const fixture = new PagerFixture();
    fixture.view.scrollTop = 300;
    fixture.pager().up(1);
    expect(fixture.view.scrollTop).toBe(240);
  });

  test("focus follows the message a third of the way down the view", () => {
    const fixture = new PagerFixture();
    fixture.pager().down(1);
    expect(fixture.focusedAt).toEqual([60 + VIEW_HEIGHT / 3]);
  });

  test("the last message takes focus once the thread is scrolled to the bottom", () => {
    const fixture = new PagerFixture();
    fixture.view.scrollTop = THREAD_HEIGHT - VIEW_HEIGHT - 60;
    fixture.pager().down(1);
    expect(fixture.focusedAt).toEqual([THREAD_HEIGHT]);
  });

  test("each scroll is logged with the positions it went between", () => {
    const fixture = new PagerFixture();
    fixture.pager().down(2);
    expect(fixture.logged).toEqual([
      "thread down: scrollTop 0 -> 120 of 2400, view 600px, focused message spans -100..1900",
    ]);
  });
});
