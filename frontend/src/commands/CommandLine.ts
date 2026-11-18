import { LineEditor } from "./LineEditor";
import { LineView } from "./LineView";

export type PromptSymbol = ":" | "/" | "?";

type Submit = (text: string) => void;
type Closed = () => void;

export class CommandLine {
  readonly element: HTMLElement;
  private readonly promptElement: HTMLElement;
  private readonly line: LineEditor = new LineEditor();
  private readonly view: LineView;
  private submit: Submit | null = null;
  private closed: Closed | null = null;

  constructor(document: Document) {
    this.element = document.createElement("label");
    this.element.className = "status-bar-segment status-bar-fill command-line";
    this.element.dataset["test"] = "command-line";
    this.element.hidden = true;
    this.promptElement = document.createElement("span");
    this.promptElement.className = "command-line-prompt";
    this.view = new LineView(document);
    this.element.append(this.promptElement, this.view.element);
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
    this.line.replace("");
    this.view.show(this.line);
    this.element.hidden = false;
  }

  press(token: string): void {
    if (token === "<CR>") this.accept();
    else if (token === "<Esc>") this.close();
    else if (this.closesOnDelete(token)) this.close();
    else if (this.line.press(token)) this.view.show(this.line);
  }

  cancel(): void {
    if (this.isOpen) this.close();
  }

  private closesOnDelete(token: string): boolean {
    return (token === "<BS>" || token === "<C-h>") && this.line.text === "";
  }

  private accept(): void {
    const submit = this.submit;
    const text = this.line.text;
    this.close();
    submit?.(text);
  }

  private close(): void {
    const closed = this.closed;
    this.submit = null;
    this.closed = null;
    this.element.hidden = true;
    closed?.();
  }
}
