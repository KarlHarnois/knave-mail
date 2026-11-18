import { KeyNotation } from "../keys/KeyNotation";

export type PromptSymbol = ":" | "/" | "?";

type Submit = (text: string) => void;
type Closed = () => void;

export class CommandLine {
  readonly element: HTMLElement;
  private readonly promptElement: HTMLElement;
  private readonly textElement: HTMLElement;
  private text = "";
  private submit: Submit | null = null;
  private closed: Closed | null = null;

  constructor(
    document: Document,
    private readonly notation: KeyNotation = new KeyNotation(),
  ) {
    this.element = document.createElement("div");
    this.element.className = "command-line";
    this.element.dataset["test"] = "command-line";
    this.element.hidden = true;
    this.promptElement = this.appendSpan(document, "command-line-prompt");
    this.textElement = this.appendSpan(document, "command-line-text");
    this.appendSpan(document, "command-line-cursor");
  }

  get isOpen(): boolean {
    return this.submit !== null;
  }

  get prompt(): string {
    return this.promptElement.textContent ?? "";
  }

  open(prompt: PromptSymbol, submit: Submit, closed: Closed | null = null): void {
    this.submit = submit;
    this.closed = closed;
    this.promptElement.textContent = prompt;
    this.replaceText("");
    this.element.hidden = false;
  }

  press(token: string): void {
    if (token === "<CR>") this.accept();
    else if (token === "<Esc>") this.close();
    else if (token === "<BS>") this.deleteBackward();
    else if (token === "<C-u>") this.replaceText("");
    else if (this.notation.isPrintable(token)) this.replaceText(this.text + token);
  }

  private accept(): void {
    const submit = this.submit;
    const text = this.text;
    this.close();
    submit?.(text);
  }

  private deleteBackward(): void {
    if (this.text === "") this.close();
    else this.replaceText(this.text.slice(0, -1));
  }

  cancel(): void {
    if (this.isOpen) this.close();
  }

  private close(): void {
    const closed = this.closed;
    this.submit = null;
    this.closed = null;
    this.element.hidden = true;
    closed?.();
  }

  private replaceText(text: string): void {
    this.text = text;
    this.textElement.textContent = text;
  }

  private appendSpan(document: Document, className: string): HTMLElement {
    const span = document.createElement("span");
    span.className = className;
    this.element.append(span);
    return span;
  }
}
