import type { Screen } from "../app/Screen";
import type { ThreadSummary } from "../bridge/Protocol";
import type { Action, ThreadAction } from "../keys/KeyBindings";
import { MessageReplies } from "./MessageReplies";
import { MessageStack } from "./MessageStack";
import { ThreadHeader } from "./ThreadHeader";
import { ThreadPager } from "./ThreadPager";
import type { ThreadScreenPorts } from "./ThreadScreenPorts";
import { ThreadTextMode } from "./ThreadTextMode";
import { ThreadTriage } from "./ThreadTriage";

type Handler = (count: number) => void;

export class ThreadScreen implements Screen {
  readonly keyMode = "thread" as const;
  readonly element: HTMLElement;
  private readonly header: ThreadHeader;
  private readonly replies: MessageReplies;
  private readonly messages: MessageStack;
  private readonly pager: ThreadPager;
  private readonly handlers: ReadonlyMap<Action, Handler>;
  private readonly textMode: ThreadTextMode;
  private readonly triage: ThreadTriage;
  private openGeneration = 0;

  constructor(private readonly ports: ThreadScreenPorts) {
    const document = ports.cards.document;
    this.element = document.createElement("section");
    this.element.className = "thread-view";
    this.element.dataset["test"] = "thread-view";
    this.element.tabIndex = -1;
    this.header = new ThreadHeader(document);
    this.replies = new MessageReplies(ports);
    this.messages = new MessageStack(ports.cards);
    this.pager = new ThreadPager(this.element, this.messages);
    this.element.append(this.header.element, this.messages.element);
    this.textMode = new ThreadTextMode(ports.host, () => this.focus());
    this.triage = new ThreadTriage(this.header, ports.actions, () => this.close());
    this.handlers = this.createHandlers();
  }

  open(summary: ThreadSummary): void {
    this.closeCards();
    this.header.show(this.ports.actions.markRead(summary));
    this.ports.host.push(this);
    this.ports.errors.run(this.load(summary.id));
  }

  refresh(): void {
    if (this.isShown()) this.header.withSummary((summary) => this.ports.errors.run(this.load(summary.id)));
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

  private isShown(): boolean {
    return this.element.isConnected && !this.element.hasAttribute("hidden");
  }

  private async load(threadId: string): Promise<void> {
    const generation = ++this.openGeneration;
    const thread = await this.ports.mail.thread(this.ports.session.account, threadId);
    if (generation === this.openGeneration) this.messages.show(thread);
  }

  private createHandlers(): ReadonlyMap<ThreadAction, Handler> {
    return new Map<ThreadAction, Handler>([
      ...this.movementHandlers(),
      ...this.messageHandlers(),
      ...this.triage.handlers(),
    ]);
  }

  private movementHandlers(): [ThreadAction, Handler][] {
    return [
      ["back", () => this.close()],
      ["nextMessage", (count) => this.messages.focusBy(count)],
      ["previousMessage", (count) => this.messages.focusBy(-count)],
      ["nextThread", (count) => this.openNeighbour(count)],
      ["previousThread", (count) => this.openNeighbour(-count)],
      ["firstMessage", () => this.pager.top()],
      ["lastMessage", () => this.messages.focusLast()],
      ["lineDown", (count) => this.pager.down(count)],
      ["lineUp", (count) => this.pager.up(count)],
      ["scrollDown", () => this.pager.halfPageDown()],
      ["scrollUp", () => this.pager.halfPageUp()],
    ];
  }

  private messageHandlers(): [ThreadAction, Handler][] {
    return [
      ["reply", () => this.messages.withFocused((card) => this.replies.reply(card))],
      ["replyAll", () => this.messages.withFocused((card) => this.replies.replyAll(card))],
      ["forward", () => this.messages.withFocused((card) => this.replies.forward(card))],
      ["toggleTextMode", () => this.messages.withFocused((card) => this.textMode.enter(card))],
      ["loadRemoteImages", () => this.messages.withFocused((card) => card.allowRemoteImages())],
    ];
  }

  private openNeighbour(offset: number): void {
    const neighbour = this.ports.neighbourThread(offset);
    if (!neighbour || neighbour.id === this.header.threadId) return;
    this.triage.putAway();
    this.open(neighbour);
  }

  private close(): void {
    this.triage.putAway();
    this.closeCards();
    this.ports.host.back();
  }

  private closeCards(): void {
    this.openGeneration++;
    this.textMode.leave();
    this.messages.clear();
  }
}
