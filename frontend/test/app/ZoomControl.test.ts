import { describe, expect, test } from "bun:test";
import { ZoomControl } from "../../src/app/ZoomControl";

class ZoomFixture {
  readonly notices: string[] = [];
  readonly levels: number[] = [];
  readonly zoom = new ZoomControl(
    (level) => this.levels.push(level),
    (notice) => this.notices.push(notice),
  );

  constructor() {
    this.zoom.listen(document);
  }

  press(key: string, ctrlKey = true): KeyboardEvent {
    const event = new KeyboardEvent("keydown", { key, ctrlKey, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event;
  }

  appliedZoom(): number | undefined {
    return this.levels.at(-1);
  }
}

describe("zoom", () => {
  test("ctrl and = zooms in by a tenth", () => {
    const fixture = new ZoomFixture();
    fixture.press("=");
    expect(fixture.appliedZoom()).toBe(1.1);
    expect(fixture.notices.at(-1)).toBe("zoom 110%");
  });

  test("ctrl and + zooms in too", () => {
    const fixture = new ZoomFixture();
    fixture.press("+");
    expect(fixture.zoom.level).toBe(1.1);
  });

  test("ctrl and - zooms out", () => {
    const fixture = new ZoomFixture();
    fixture.press("-");
    fixture.press("-");
    expect(fixture.zoom.level).toBe(0.8);
  });

  test("ctrl and 0 resets the zoom", () => {
    const fixture = new ZoomFixture();
    fixture.press("=");
    fixture.press("0");
    expect(fixture.appliedZoom()).toBe(1);
  });

  test("the zoom stays between half and three times", () => {
    const fixture = new ZoomFixture();
    for (let press = 0; press < 40; press++) fixture.press("=");
    expect(fixture.zoom.level).toBe(3);
    for (let press = 0; press < 40; press++) fixture.press("-");
    expect(fixture.zoom.level).toBe(0.5);
  });

  test("a zoom key stops before the rest of the app", () => {
    const fixture = new ZoomFixture();
    expect(fixture.press("=").defaultPrevented).toBe(true);
  });

  test("keys without ctrl pass through", () => {
    const fixture = new ZoomFixture();
    fixture.press("-", false);
    expect(fixture.zoom.level).toBe(1);
    expect(fixture.notices).toEqual([]);
  });
});
