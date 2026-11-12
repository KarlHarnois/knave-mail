import type { ThreadSummary } from "../bridge/Protocol";
import { ArchivedMarker } from "../list/ArchivedMarker";

const STAR = "★";

export class ThreadHeader {
  readonly element: HTMLElement;
  private readonly star: HTMLElement;
  private readonly subject: HTMLElement;
  private readonly archived: HTMLElement;
  private readonly archivedMarker = new ArchivedMarker();
  private summary: ThreadSummary | null = null;

  constructor(document: Document) {
    this.element = document.createElement("h1");
    this.element.className = "thread-subject";
    this.element.dataset["test"] = "thread-subject";
    this.star = this.part(document, "thread-star");
    this.subject = this.part(document, "thread-title");
    this.archived = this.part(document, "thread-archived");
    this.element.append(this.star, this.subject, this.archived);
  }

  get threadId(): string | undefined {
    return this.summary?.id;
  }

  show(summary: ThreadSummary): void {
    this.summary = summary;
    this.star.textContent = summary.starred ? STAR : "";
    this.subject.textContent = summary.subject;
    this.archived.textContent = this.archivedMarker.textFor(summary);
  }

  withSummary(act: (summary: ThreadSummary) => void): void {
    if (this.summary) act(this.summary);
  }

  private part(document: Document, name: string): HTMLElement {
    const part = document.createElement("span");
    part.className = name;
    part.dataset["test"] = name;
    return part;
  }
}
