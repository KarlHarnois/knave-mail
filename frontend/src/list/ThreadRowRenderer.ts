import type { ThreadSummary } from "../bridge/Protocol";
import type { DateLabel } from "../render/DateLabel";

type RowParts = { star: HTMLElement; from: HTMLElement; subject: HTMLElement; snippet: HTMLElement; date: HTMLElement };

const STAR = "★";
const ROW_TEST_ID = "thread-row";
const SELECTED_ROW_TEST_ID = "selected-row";
const CHOSEN_ROW_TEST_ID = "chosen-row";

export class ThreadRowRenderer {
  private readonly parts = new WeakMap<HTMLElement, RowParts>();

  constructor(
    private readonly document: Document,
    private readonly dates: DateLabel,
  ) {}

  create(): HTMLElement {
    const row = this.document.createElement("div");
    row.className = "thread-row";
    row.dataset["test"] = ROW_TEST_ID;
    row.setAttribute("role", "option");
    this.parts.set(row, {
      star: this.appendPart(row, "row-star"),
      from: this.appendPart(row, "row-from"),
      subject: this.appendPart(row, "row-subject"),
      snippet: this.appendPart(row, "row-snippet"),
      date: this.appendPart(row, "row-date"),
    });
    return row;
  }

  fill(row: HTMLElement, summary: ThreadSummary): void {
    const parts = this.partsOf(row);
    row.dataset["threadId"] = summary.id;
    row.classList.toggle("unread", summary.unread);
    parts.star.textContent = summary.starred ? STAR : "";
    parts.from.textContent = this.participantsWithCount(summary);
    parts.subject.textContent = summary.subject;
    parts.snippet.textContent = summary.snippet;
    parts.date.textContent = this.dates.short(summary.date);
  }

  markSelected(row: HTMLElement, selected: boolean, chosen: boolean): void {
    row.classList.toggle("selected", selected);
    row.classList.toggle("chosen", chosen);
    row.dataset["test"] = this.testTokens(selected, chosen);
    row.setAttribute("aria-selected", String(selected || chosen));
  }

  private testTokens(selected: boolean, chosen: boolean): string {
    const tokens = [ROW_TEST_ID];
    if (selected) tokens.push(SELECTED_ROW_TEST_ID);
    if (chosen) tokens.push(CHOSEN_ROW_TEST_ID);
    return tokens.join(" ");
  }

  private participantsWithCount(summary: ThreadSummary): string {
    return summary.messageCount > 1 ? `${summary.participants} (${summary.messageCount})` : summary.participants;
  }

  private appendPart(row: HTMLElement, className: string): HTMLElement {
    const part = this.document.createElement("span");
    part.className = className;
    row.append(part);
    return part;
  }

  private partsOf(row: HTMLElement): RowParts {
    const parts = this.parts.get(row);
    if (!parts) throw new Error("row was not created by ThreadRowRenderer");
    return parts;
  }
}
