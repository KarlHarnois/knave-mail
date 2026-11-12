import type { MailColorSource, MailColors } from "../darkmail/MailDarkening";
import type { HtmlSandbox } from "./HtmlSandbox";

export type MessageFrameParts = {
  document: Document;
  sandbox: HtmlSandbox;
  darkening: MailColorSource;
  html: string;
};

export class MessageFrame {
  readonly element: HTMLIFrameElement;
  private remoteImages = false;
  private readonly sandbox: HtmlSandbox;
  private readonly html: string;
  private readonly colors: MailColors | null;

  constructor({ document, sandbox, darkening, html }: MessageFrameParts) {
    this.sandbox = sandbox;
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
    if (!this.colors) root.style.background = getComputedStyle(this.element).backgroundColor;
    this.element.style.height = `${root.scrollHeight}px`;
    this.element.style.visibility = "visible";
  }
}
