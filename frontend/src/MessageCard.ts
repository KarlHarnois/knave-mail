import type { DateLabel } from "./DateLabel";
import type { HtmlSandbox } from "./HtmlSandbox";
import { MessageFrame } from "./MessageFrame";
import type { Message } from "./Protocol";
import type { VimEditor, VimEditorOptions } from "./VimEditor";
import type { VimEditorFactory } from "./VimEditorFactory";

export type MessageCardServices = {
  document: Document;
  sandbox: HtmlSandbox;
  dates: DateLabel;
  editors: VimEditorFactory;
};

export type ReaderOptions = Omit<VimEditorOptions, "text">;

const SNIPPET_LENGTH = 140;
const MESSAGE_TEST_ID = "message";
const FOCUSED_MESSAGE_TEST_ID = "message focused-message";

export class MessageCard {
  readonly element: HTMLElement;
  private readonly body: HTMLElement;
  private renderedBody: HTMLElement | null = null;
  private frame: MessageFrame | null = null;
  private reader: VimEditor | null = null;
  private readerHost: HTMLElement | null = null;

  constructor(
    readonly message: Message,
    private readonly services: MessageCardServices,
  ) {
    this.element = this.createElement("article", "message");
    this.element.dataset["test"] = MESSAGE_TEST_ID;
    this.element.dataset["messageId"] = message.id;
    this.element.dataset["expanded"] = "false";
    this.element.append(this.createHeader());
    this.body = this.createElement("div", "message-body");
    this.element.append(this.body);
  }

  get isInTextMode(): boolean {
    return this.reader !== null;
  }

  expand(): void {
    this.element.dataset["expanded"] = "true";
    this.renderedBody ??= this.renderBody();
  }

  showFocus(focused: boolean): void {
    this.element.classList.toggle("focused", focused);
    this.element.dataset["test"] = focused ? FOCUSED_MESSAGE_TEST_ID : MESSAGE_TEST_ID;
  }

  enterTextMode(options: ReaderOptions): void {
    this.expand();
    this.readerHost = this.createElement("div", "text-reader");
    this.readerHost.dataset["test"] = "text-reader";
    this.body.append(this.readerHost);
    this.renderedBody?.setAttribute("hidden", "");
    this.reader = this.services.editors.createReader(this.readerHost, { ...options, text: this.message.text });
    this.reader.focus();
  }

  leaveTextMode(): void {
    this.reader?.destroy();
    this.readerHost?.remove();
    this.reader = null;
    this.readerHost = null;
    this.renderedBody?.removeAttribute("hidden");
  }

  pressInReader(token: string): void {
    this.reader?.press(token);
  }

  allowRemoteImages(): void {
    this.frame?.allowRemoteImages();
  }

  private renderBody(): HTMLElement {
    const rendered = this.message.html === null ? this.renderText() : this.renderHtml(this.message.html);
    this.body.append(rendered);
    return rendered;
  }

  private renderHtml(html: string): HTMLElement {
    this.frame = new MessageFrame(this.services.document, this.services.sandbox, html);
    return this.frame.element;
  }

  private renderText(): HTMLElement {
    const text = this.createElement("pre", "message-text");
    text.dataset["test"] = "message-text";
    text.textContent = this.message.text;
    return text;
  }

  private createHeader(): HTMLElement {
    const header = this.createElement("header", "message-header");
    header.append(
      this.createText("message-from", this.message.from),
      this.createText("message-date", this.services.dates.long(this.message.date)),
      this.createText("message-recipients", this.recipients()),
      this.createText("message-snippet", this.snippet()),
    );
    return header;
  }

  private recipients(): string {
    const to = `to ${this.message.to.join(", ")}`;
    return this.message.cc.length > 0 ? `${to}, cc ${this.message.cc.join(", ")}` : to;
  }

  private snippet(): string {
    return this.message.text.replace(/\s+/g, " ").trim().slice(0, SNIPPET_LENGTH);
  }

  private createText(className: string, text: string): HTMLElement {
    const element = this.createElement("span", className);
    element.textContent = text;
    return element;
  }

  private createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const element = this.services.document.createElement(tag);
    element.className = className;
    return element;
  }
}
