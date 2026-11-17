import type { Logger } from "../logging/Logger";
import type { MessageStack } from "./MessageStack";

const LINE_SCROLL_PIXELS = 60;
const EDGE_TOLERANCE_PIXELS = 1;
const FOCUS_LINE_FRACTION = 3;

export class ThreadPager {
  constructor(
    private readonly view: HTMLElement,
    private readonly messages: MessageStack,
    private readonly logger: Logger,
  ) {}

  down(count: number): void {
    this.traced("down", () => {
      for (let step = 0; step < count; step++) this.stepDown();
    });
  }

  up(count: number): void {
    this.traced("up", () => {
      for (let step = 0; step < count; step++) this.stepUp();
    });
  }

  top(): void {
    this.traced("top", () => {
      this.messages.focusFirst();
      this.view.scrollTop = 0;
    });
  }

  bottom(): void {
    this.traced("bottom", () => {
      this.messages.focusLast();
      this.view.scrollTop = this.view.scrollHeight;
    });
  }

  halfPageDown(): void {
    this.traced("half page down", () => this.scrollBy(this.view.clientHeight / 2));
  }

  halfPageUp(): void {
    this.traced("half page up", () => this.scrollBy(-this.view.clientHeight / 2));
  }

  private traced(action: string, move: () => void): void {
    const before = Math.round(this.view.scrollTop);
    move();
    this.logger.debug(`thread ${action}: ${this.scrollReport(before)}`);
  }

  private scrollReport(before: number): string {
    const after = Math.round(this.view.scrollTop);
    const farthest = this.view.scrollHeight - this.view.clientHeight;
    return `scrollTop ${before} -> ${after} of ${farthest}, view ${this.view.clientHeight}px, ${this.focusedSpan()}`;
  }

  private focusedSpan(): string {
    const message = this.messages.focusedElement()?.getBoundingClientRect();
    if (!message) return "no focused message";
    const viewTop = this.view.getBoundingClientRect().top;
    return `focused message spans ${Math.round(message.top - viewTop)}..${Math.round(message.bottom - viewTop)}`;
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
