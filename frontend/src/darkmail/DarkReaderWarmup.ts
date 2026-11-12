import type { HtmlSandbox } from "../thread/HtmlSandbox";
import type { MailColorSource } from "./MailDarkening";

export class DarkReaderWarmup {
  constructor(
    private readonly document: Document,
    private readonly sandbox: HtmlSandbox,
    private readonly darkening: MailColorSource,
  ) {}

  start(): void {
    const colors = this.darkening.colors();
    if (!colors) return;
    const frame = this.document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("sandbox", this.sandbox.sandboxFlagsFor(colors));
    frame.addEventListener("load", () => frame.remove());
    frame.srcdoc = this.sandbox.srcdoc("", false, colors);
    this.document.body.append(frame);
  }
}
