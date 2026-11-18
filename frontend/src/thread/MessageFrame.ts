import { ColorTone } from "../darkmail/ColorTone";
import type { MailColorSource, MailColors } from "../darkmail/MailDarkening";
import type { HtmlSandbox } from "./HtmlSandbox";
import type { MessageLinks } from "./MessageLinks";

export type MessageFrameParts = {
  document: Document;
  sandbox: HtmlSandbox;
  darkening: MailColorSource;
  links: MessageLinks;
  html: string;
};

const DARKENING_WAIT_MILLISECONDS = 1000;

export class MessageFrame {
  readonly element: HTMLIFrameElement;
  private remoteImages = false;
  private readonly sandbox: HtmlSandbox;
  private readonly html: string;
  private readonly colors: MailColors | null;
  private readonly tone = new ColorTone();
  private readonly links: MessageLinks;

  constructor({ document, sandbox, darkening, links, html }: MessageFrameParts) {
    this.sandbox = sandbox;
    this.links = links;
    this.html = html;
    this.colors = darkening.colors();
    this.element = document.createElement("iframe");
    this.element.className = "message-html";
    this.element.dataset["test"] = "message-html";
    this.element.tabIndex = -1;
    this.element.setAttribute("sandbox", sandbox.sandboxFlagsFor(this.colors));
    this.element.setAttribute("referrerpolicy", "no-referrer");
    this.element.addEventListener("load", () => this.settle());
    this.load();
  }

  get allowsRemoteImages(): boolean {
    return this.remoteImages;
  }

  allowRemoteImages(): void {
    this.remoteImages = true;
    this.load();
  }

  private load(): void {
    this.element.style.visibility = "hidden";
    this.element.srcdoc = this.sandbox.srcdoc(this.html, this.remoteImages, this.colors);
  }

  private settle(): void {
    const root = this.element.contentDocument?.documentElement;
    if (!root) return;
    this.links.follow(root.ownerDocument);
    if (this.colors) this.revealOnceDark(performance.now() + DARKENING_WAIT_MILLISECONDS);
    else this.revealLight(root);
  }

  private revealLight(root: HTMLElement): void {
    root.style.background = getComputedStyle(this.element).backgroundColor;
    this.reveal();
  }

  private revealOnceDark(deadline: number): void {
    if (this.looksDark() || performance.now() > deadline) this.reveal();
    else requestAnimationFrame(() => this.revealOnceDark(deadline));
  }

  private looksDark(): boolean {
    const view = this.element.contentWindow;
    const mail = this.element.contentDocument;
    if (!view || !mail?.body) return false;
    const page = view.getComputedStyle(mail.documentElement).backgroundColor;
    const body = view.getComputedStyle(mail.body).backgroundColor;
    return this.tone.isDark(page) && (this.tone.isTransparent(body) || this.tone.isDark(body));
  }

  private reveal(): void {
    const root = this.element.contentDocument?.documentElement;
    if (root) this.element.style.height = `${root.scrollHeight}px`;
    this.element.style.visibility = "visible";
  }
}
