import { describe, expect, test } from "bun:test";
import type { MessageStack } from "../../src/thread/MessageStack";
import { ThreadPager } from "../../src/thread/ThreadPager";

class PagerFixture {
  readonly view = document.createElement("section");
  readonly message = document.createElement("article");
  readonly steps: number[] = [];

  constructor(messageTop: number, messageBottom: number) {
    this.view.getBoundingClientRect = () => new DOMRect(0, 0, 800, 600);
    this.message.getBoundingClientRect = () => new DOMRect(0, messageTop, 800, messageBottom - messageTop);
  }

  pager(): ThreadPager {
    const messages = { focusedElement: () => this.message, stepBy: (offset: number) => this.steps.push(offset) };
    return new ThreadPager(this.view, messages as unknown as MessageStack);
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

  test("k scrolls up through a message that starts above the screen", () => {
    const fixture = new PagerFixture(-900, 500);
    fixture.view.scrollTop = 300;
    fixture.pager().up(1);
    expect(fixture.view.scrollTop).toBe(240);
  });

  test("k moves to the previous message once the focused one starts on screen", () => {
    const fixture = new PagerFixture(50, 400);
    fixture.pager().up(1);
    expect(fixture.steps).toEqual([-1]);
  });
});
