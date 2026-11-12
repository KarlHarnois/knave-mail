import type { Thread } from "../bridge/Protocol";
import { MessageCard, type MessageCardServices } from "./MessageCard";

export class MessageStack {
  readonly element: HTMLElement;
  private cards: MessageCard[] = [];
  private focusIndex = 0;

  constructor(private readonly services: MessageCardServices) {
    this.element = services.document.createElement("div");
    this.element.className = "thread-messages";
  }

  show(thread: Thread): void {
    this.cards = thread.messages.map((message) => new MessageCard(message, this.services));
    this.element.replaceChildren(...this.cards.map((card) => card.element));
    this.focusLast();
  }

  clear(): void {
    this.cards = [];
    this.element.replaceChildren();
  }

  focusBy(offset: number): void {
    this.focus(this.focusIndex + offset);
  }

  focusFirst(): void {
    this.focus(0);
  }

  focusLast(): void {
    this.focus(this.cards.length - 1);
  }

  withFocused(act: (card: MessageCard) => void): void {
    const card = this.cards[this.focusIndex];
    if (card) act(card);
  }

  private focus(index: number): void {
    const target = Math.min(Math.max(0, index), this.cards.length - 1);
    this.cards[this.focusIndex]?.showFocus(false);
    this.focusIndex = target;
    this.withFocused((card) => this.reveal(card));
  }

  private reveal(card: MessageCard): void {
    card.expand();
    card.showFocus(true);
    card.element.scrollIntoView?.({ block: "nearest" });
  }
}
