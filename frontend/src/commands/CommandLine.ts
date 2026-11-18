import { LineEditor } from "./LineEditor";
import { LineView } from "./LineView";

export type PromptSymbol = ":" | "/" | "?";

type Submit = (text: string) => void;
type Closed = () => void;
export type Counter = (text: string) => string;
export type PromptOptions = { readonly closed?: Closed; readonly counter?: Counter };

export class CommandLine {
  readonly element: HTMLElement;
  private readonly promptElement: HTMLElement;
  private readonly line: LineEditor = new LineEditor();
  private readonly view: LineView;
  private readonly count: HTMLElement;
  private counter: Counter | null = null;
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
    this.count = document.createElement("span");
    this.count.className = "command-line-count";
    this.element.append(this.promptElement, this.view.element, this.count);
  }

  get isOpen(): boolean {
    return this.submit !== null;
  }

  get prompt(): string {
    return this.promptElement.textContent ?? "";
  }

  open(prompt: PromptSymbol, submit: Submit, options: PromptOptions = {}): void {
    this.submit = submit;
    this.closed = options.closed ?? null;
    this.counter = options.counter ?? null;
    this.promptElement.textContent = prompt;
    this.line.replace("");
    this.show();
    this.element.hidden = false;
  }

  press(token: string): void {
    if (token === "<CR>") this.accept();
    else if (token === "<Esc>") this.close();
    else if (this.closesOnDelete(token)) this.close();
    else if (this.line.press(token)) this.show();
  }

  cancel(): void {
    if (this.isOpen) this.close();
  }

  private show(): void {
    this.view.show(this.line);
    this.count.textContent = this.counter && this.line.text ? this.counter(this.line.text) : "";
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
