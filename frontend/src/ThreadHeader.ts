import type { ThreadSummary } from "./Protocol";

const STAR = "★ ";

export class ThreadHeader {
  readonly element: HTMLElement;
  private summary: ThreadSummary | null = null;

  constructor(document: Document) {
    this.element = document.createElement("h1");
    this.element.className = "thread-subject";
    this.element.dataset.test = "thread-subject";
  }

  get threadId(): string | undefined {
    return this.summary?.id;
  }

  show(summary: ThreadSummary): void {
    this.summary = summary;
    const prefix = summary.starred ? STAR : "";
    this.element.textContent = prefix + summary.subject;
  }

  withSummary(act: (summary: ThreadSummary) => void): void {
    if (this.summary) act(this.summary);
  }
}
