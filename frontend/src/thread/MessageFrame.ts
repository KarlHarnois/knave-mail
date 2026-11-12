import type { HtmlSandbox } from "./HtmlSandbox";

export class MessageFrame {
  readonly element: HTMLIFrameElement;
  private remoteImages = false;

  constructor(
    document: Document,
    private readonly sandbox: HtmlSandbox,
    private readonly html: string,
  ) {
    this.element = document.createElement("iframe");
    this.element.className = "message-html";
    this.element.dataset["test"] = "message-html";
    this.element.tabIndex = -1;
    this.element.setAttribute("sandbox", sandbox.sandboxFlags);
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
    this.element.srcdoc = this.sandbox.srcdoc(this.html, this.remoteImages);
  }

  private settle(): void {
    const root = this.element.contentDocument?.documentElement;
    if (!root) return;
    root.style.background = getComputedStyle(this.element).backgroundColor;
    this.element.style.height = `${root.scrollHeight}px`;
  }
}
