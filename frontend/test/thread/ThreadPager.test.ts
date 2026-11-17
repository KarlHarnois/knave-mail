import { describe, expect, test } from "bun:test";
import type { Logger } from "../../src/logging/Logger";
import type { MessageStack } from "../../src/thread/MessageStack";
import { ThreadPager } from "../../src/thread/ThreadPager";

class PagerFixture {
  readonly view = document.createElement("section");
  readonly message = document.createElement("article");
  readonly steps: number[] = [];
  readonly logged: string[] = [];
  hasNeighbours = true;

  constructor(messageTop: number, messageBottom: number) {
    this.view.getBoundingClientRect = () => new DOMRect(0, 0, 800, 600);
    this.message.getBoundingClientRect = () => new DOMRect(0, messageTop, 800, messageBottom - messageTop);
  }

  pager(): ThreadPager {
    const messages = {
      focusedElement: () => this.message,
      hasNeighbour: () => this.hasNeighbours,
      stepBy: (offset: number) => this.steps.push(offset),
    };
    const logger = { debug: (message: string) => this.logged.push(message) };
    return new ThreadPager(this.view, messages as unknown as MessageStack, logger as unknown as Logger);
  }
}

describe("thread pager", () => {
  test("j scrolls through a message that continues below the screen", () => {
    const fixture = new PagerFixture(0, 2000);
    fixture.pager().down(2);
    expect(fixture.view.scrollTop).toBe(120);
    expect(fixture.steps).toEqual([]);
  });

  test("j moves to the next message once the focused one fits", () => {
    const fixture = new PagerFixture(100, 400);
    fixture.pager().down(1);
    expect(fixture.steps).toEqual([1]);
  });

  test("j keeps scrolling to the end of the thread after its last message", () => {
    const fixture = new PagerFixture(100, 400);
    fixture.hasNeighbours = false;
    fixture.pager().down(1);
    expect(fixture.view.scrollTop).toBe(60);
    expect(fixture.steps).toEqual([]);
  });

  test("k keeps scrolling to the top of the thread above its first message", () => {
    const fixture = new PagerFixture(0, 2000);
    fixture.hasNeighbours = false;
    fixture.view.scrollTop = 60;
    fixture.pager().up(1);
    expect(fixture.view.scrollTop).toBe(0);
    expect(fixture.steps).toEqual([]);
  });

  test("k scrolls up through a message that starts above the screen", () => {
    const fixture = new PagerFixture(-900, 500);
    fixture.view.scrollTop = 300;
    fixture.pager().up(1);
    expect(fixture.view.scrollTop).toBe(240);
  });

  test("each scroll is logged with the positions it went between", () => {
    const fixture = new PagerFixture(0, 2000);
    fixture.pager().down(2);
    expect(fixture.logged).toEqual(["thread down: scrollTop 0 -> 120 of 0, view 0px, focused message spans 0..2000"]);
  });

  test("k moves to the previous message once the focused one starts on screen", () => {
    const fixture = new PagerFixture(50, 400);
    fixture.pager().up(1);
    expect(fixture.steps).toEqual([-1]);
  });
});
