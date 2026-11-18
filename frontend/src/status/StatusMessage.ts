export type MessageKind = "notice" | "error";

const EMPTY_TEST_ID = "status-message";

export class StatusMessage {
  readonly element: HTMLElement;
  private kind: MessageKind | null = null;

  constructor(document: Document) {
    this.element = document.createElement("span");
    this.element.className = "status-bar-segment status-bar-message";
    this.element.dataset["test"] = EMPTY_TEST_ID;
    this.element.setAttribute("aria-live", "polite");
  }

  show(kind: MessageKind, text: string): void {
    this.kind = text ? kind : null;
    this.element.textContent = text;
    this.element.classList.toggle("is-error", this.kind === "error");
    this.element.dataset["test"] = this.kind ? `status-${this.kind}` : EMPTY_TEST_ID;
  }

  clear(kind?: MessageKind): void {
    if (kind === undefined || kind === this.kind) this.show("notice", "");
  }

  read(kind: MessageKind): string {
    return this.kind === kind ? (this.element.textContent ?? "") : "";
  }
}
