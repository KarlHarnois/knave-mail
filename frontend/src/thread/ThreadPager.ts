import type { MessageStack } from "./MessageStack";

const LINE_SCROLL_PIXELS = 60;
const EDGE_TOLERANCE_PIXELS = 1;

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
