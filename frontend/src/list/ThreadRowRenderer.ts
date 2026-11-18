import type { ThreadSummary } from "../bridge/Protocol";
import type { DateLabel } from "../render/DateLabel";
import { ArchivedMarker } from "./ArchivedMarker";

type RowParts = {
  star: HTMLElement;
  from: HTMLElement;
  archived: HTMLElement;
  subject: HTMLElement;
  snippet: HTMLElement;
  date: HTMLElement;
};

const STAR = "★";
const ROW_TEST_ID = "thread-row";
const SELECTED_ROW_TEST_ID = "selected-row";
const CHOSEN_ROW_TEST_ID = "chosen-row";

export class ThreadRowRenderer {
  private readonly parts = new WeakMap<HTMLElement, RowParts>();
  private readonly archived = new ArchivedMarker();

  constructor(
    private readonly document: Document,
    private readonly dates: DateLabel,
  ) {}

  create(): HTMLElement {
    const row = this.document.createElement("tr");
    row.className = "thread-row";
    row.dataset["test"] = ROW_TEST_ID;
    this.parts.set(row, {
      star: this.appendCell(row, "row-star"),
      from: this.appendCell(row, "row-from table-cell-active"),
      ...this.appendSubject(row),
      date: this.appendCell(row, "row-date table-number"),
    });
    return row;
  }

  fill(row: HTMLElement, summary: ThreadSummary): void {
    const parts = this.partsOf(row);
    row.dataset["threadId"] = summary.id;
    row.classList.toggle("unread", summary.unread);
    parts.star.textContent = summary.starred ? STAR : "";
    parts.from.textContent = this.participantsWithCount(summary);
    parts.archived.textContent = this.archived.textFor(summary);
    parts.subject.textContent = summary.subject;
    parts.snippet.textContent = summary.snippet;
    parts.date.textContent = this.dates.short(summary.date);
  }

  markSelected(row: HTMLElement, selected: boolean, chosen: boolean): void {
    row.classList.toggle("is-cursor", selected);
    row.classList.toggle("is-selected", chosen);
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

  private appendSubject(row: HTMLElement): Pick<RowParts, "archived" | "subject" | "snippet"> {
    const cell = this.appendCell(row, "row-subject");
    return {
      archived: this.appendPart(cell, "span", "row-archived"),
      subject: this.appendPart(cell, "span", "row-subject-text"),
      snippet: this.appendPart(cell, "span", "row-snippet"),
    };
  }

  private appendCell(row: HTMLElement, className: string): HTMLElement {
    return this.appendPart(row, "td", className);
  }

  private appendPart(parent: HTMLElement, tag: "td" | "span", className: string): HTMLElement {
    const part = this.document.createElement(tag);
    part.className = className;
    parent.append(part);
    return part;
  }

  private partsOf(row: HTMLElement): RowParts {
    const parts = this.parts.get(row);
    if (!parts) throw new Error("row was not created by ThreadRowRenderer");
    return parts;
  }
}
