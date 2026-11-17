import type { MessageStack } from "./MessageStack";

const LINE_SCROLL_PIXELS = 60;
const EDGE_TOLERANCE_PIXELS = 1;
const FOCUS_LINE_FRACTION = 3;

export class ThreadPager {
  constructor(
    private readonly view: HTMLElement,
    private readonly messages: MessageStack,
  ) {}

  down(count: number): void {
    for (let step = 0; step < count; step++) this.stepDown();
  }

  up(count: number): void {
    for (let step = 0; step < count; step++) this.stepUp();
  }

  top(): void {
    this.messages.focusFirst();
    this.view.scrollTop = 0;
  }

  bottom(): void {
    this.messages.focusLast();
    this.view.scrollTop = this.view.scrollHeight;
  }

  halfPageDown(): void {
    this.scrollBy(this.view.clientHeight / 2);
  }

  halfPageUp(): void {
    this.scrollBy(-this.view.clientHeight / 2);
  }

  private scrollBy(pixels: number): void {
    this.view.scrollTop += pixels;
    this.messages.focusAt(this.view.scrollTop + this.view.clientHeight / FOCUS_LINE_FRACTION);
  }

  private stepDown(): void {
    const focused = this.messages.focusedElement();
    if (focused && this.continuesBelow(focused)) this.view.scrollTop += LINE_SCROLL_PIXELS;
    else this.messages.stepBy(1);
  }

  private stepUp(): void {
    const focused = this.messages.focusedElement();
    if (focused && this.continuesAbove(focused)) this.view.scrollTop -= LINE_SCROLL_PIXELS;
    else this.messages.stepBy(-1);
  }

  private continuesBelow(message: HTMLElement): boolean {
    return message.getBoundingClientRect().bottom > this.view.getBoundingClientRect().bottom + EDGE_TOLERANCE_PIXELS;
  }

  private continuesAbove(message: HTMLElement): boolean {
    return message.getBoundingClientRect().top < this.view.getBoundingClientRect().top - EDGE_TOLERANCE_PIXELS;
  }
}
