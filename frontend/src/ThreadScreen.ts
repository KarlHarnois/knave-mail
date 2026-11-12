import type { ErrorReporter } from "./ErrorReporter";
import type { Action, ThreadAction } from "./KeyBindings";
import type { MailClient } from "./MailClient";
import type { MailSession } from "./MailSession";
import { MessageCard, type MessageCardServices } from "./MessageCard";
import type { Draft, Thread, ThreadSummary } from "./Protocol";
import type { Screen } from "./Screen";
import type { ScreenHost } from "./ScreenHost";
import type { ThreadActions } from "./ThreadActions";
import { ThreadTextMode } from "./ThreadTextMode";

export type ThreadScreenPorts = {
  host: ScreenHost;
  mail: MailClient;
  session: MailSession;
  actions: ThreadActions;
  errors: ErrorReporter;
  cards: MessageCardServices;
  openDraft: (draft: Draft) => void;
};

type Handler = (count: number) => void;

const STAR = "★ ";

export class ThreadScreen implements Screen {
  readonly keyMode = "thread" as const;
  readonly element: HTMLElement;
  private readonly subject: HTMLElement;
  private readonly messages: HTMLElement;
  private readonly handlers: ReadonlyMap<Action, Handler>;
  private readonly textMode: ThreadTextMode;
  private cards: MessageCard[] = [];
  private focusIndex = 0;
  private summary: ThreadSummary | null = null;
  private openGeneration = 0;

  constructor(private readonly ports: ThreadScreenPorts) {
    const document = ports.cards.document;
    this.element = document.createElement("section");
    this.element.className = "thread-view";
    this.element.dataset.test = "thread-view";
    this.element.tabIndex = -1;
    this.subject = document.createElement("h1");
    this.subject.className = "thread-subject";
    this.subject.dataset.test = "thread-subject";
    this.messages = document.createElement("div");
    this.messages.className = "thread-messages";
    this.element.append(this.subject, this.messages);
    this.textMode = new ThreadTextMode(ports.host, () => this.focus());
    this.handlers = this.createHandlers();
  }

  open(summary: ThreadSummary): void {
    this.closeCards();
    this.summary = this.ports.actions.markRead(summary);
    this.showSubject();
    this.ports.host.push(this);
    this.ports.errors.run(this.load(summary.id));
  }

  modeName(): string {
    return this.textMode.isActive ? this.textMode.modeName() : "THREAD";
  }

  capturesKeys(): boolean {
    return this.textMode.isActive;
  }

  pressCaptured(token: string): void {
    this.textMode.press(token);
  }

  perform(action: Action, count: number | null): void {
    this.handlers.get(action)?.(count ?? 1);
  }

  focus(): void {
    this.element.focus({ preventScroll: true });
  }

  private async load(threadId: string): Promise<void> {
    const generation = ++this.openGeneration;
    const thread = await this.ports.mail.thread(this.ports.session.account, threadId);
    if (generation === this.openGeneration) this.showThread(thread);
  }

  private showThread(thread: Thread): void {
    this.cards = thread.messages.map((message) => new MessageCard(message, this.ports.cards));
    this.messages.replaceChildren(...this.cards.map((card) => card.element));
    this.focusIndex = this.cards.length - 1;
    this.focusMessage(this.focusIndex);
  }

  private createHandlers(): ReadonlyMap<ThreadAction, Handler> {
    return new Map<ThreadAction, Handler>([
      ["back", () => this.close()],
      ["nextMessage", (count) => this.focusMessage(this.focusIndex + count)],
      ["previousMessage", (count) => this.focusMessage(this.focusIndex - count)],
      ["firstMessage", () => this.focusMessage(0)],
      ["lastMessage", () => this.focusMessage(this.cards.length - 1)],
      ["scrollDown", () => this.scrollByHalfPage(1)],
      ["scrollUp", () => this.scrollByHalfPage(-1)],
      ["reply", () => this.withFocused((card) => this.reply(card, false))],
      ["replyAll", () => this.withFocused((card) => this.reply(card, true))],
      ["forward", () => this.withFocused((card) => this.forward(card))],
      ["toggleTextMode", () => this.withFocused((card) => this.textMode.enter(card))],
      ["loadRemoteImages", () => this.withFocused((card) => card.allowRemoteImages())],
      ["archive", () => this.withSummary((summary) => this.closeAfter(() => this.ports.actions.archive(summary)))],
      ["trash", () => this.withSummary((summary) => this.closeAfter(() => this.ports.actions.trash(summary)))],
      ["toggleStar", () => this.withSummary((summary) => this.showSummary(this.ports.actions.toggleStar(summary)))],
      ["toggleUnread", () => this.withSummary((summary) => this.showSummary(this.ports.actions.toggleUnread(summary)))],
    ]);
  }

  private focusMessage(index: number): void {
    const target = Math.min(Math.max(0, index), this.cards.length - 1);
    this.cards[this.focusIndex]?.showFocus(false);
    this.focusIndex = target;
    const card = this.cards[target];
    if (!card) return;
    card.expand();
    card.showFocus(true);
    card.element.scrollIntoView?.({ block: "nearest" });
  }

  private scrollByHalfPage(direction: number): void {
    this.element.scrollTop += (direction * this.element.clientHeight) / 2;
  }

  private reply(card: MessageCard, all: boolean): void {
    this.draft(this.ports.mail.replyDraft(this.account(), card.message.id, all));
  }

  private forward(card: MessageCard): void {
    this.draft(this.ports.mail.forwardDraft(this.account(), card.message.id));
  }

  private draft(request: Promise<Draft>): void {
    this.ports.errors.run(request.then((draft) => this.ports.openDraft(draft)));
  }

  private showSummary(summary: ThreadSummary): void {
    this.summary = summary;
    this.showSubject();
  }

  private showSubject(): void {
    const prefix = this.summary?.starred ? STAR : "";
    this.subject.textContent = prefix + (this.summary?.subject ?? "");
  }

  private closeAfter(act: () => void): void {
    act();
    this.close();
  }

  private close(): void {
    this.closeCards();
    this.ports.host.back();
  }

  private closeCards(): void {
    this.openGeneration++;
    this.textMode.leave();
    this.cards = [];
    this.messages.replaceChildren();
  }

  private account(): string {
    return this.ports.session.account;
  }

  private withFocused(act: (card: MessageCard) => void): void {
    const card = this.cards[this.focusIndex];
    if (card) act(card);
  }

  private withSummary(act: (summary: ThreadSummary) => void): void {
    if (this.summary) act(this.summary);
  }
}
