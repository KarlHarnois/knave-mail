import { type MessageKind, StatusMessage } from "./StatusMessage";

type SegmentField = "mode" | "account" | "label" | "sync" | "waiting" | "keys";
export type StatusField = SegmentField | MessageKind;

const LOCATION_FIELDS: readonly SegmentField[] = ["account", "label", "sync", "waiting"];
const MESSAGE_LIFETIME_MILLISECONDS = 8000;

export class StatusLine {
  readonly element: HTMLElement;
  private readonly fields = new Map<SegmentField, HTMLElement>();
  private readonly message: StatusMessage;
  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    document: Document,
    private readonly messageLifetime: number = MESSAGE_LIFETIME_MILLISECONDS,
  ) {
    this.element = document.createElement("footer");
    this.element.className = "status-bar";
    this.element.dataset["test"] = "status-line";
    this.message = new StatusMessage(document);
    this.addFields(document, ["mode", ...LOCATION_FIELDS]);
    this.element.append(this.createFill(document), this.message.element);
    this.addFields(document, ["keys"]);
    this.fieldElement("keys").setAttribute("aria-live", "polite");
  }

  holdCommandLine(commandLine: HTMLElement): void {
    this.fieldElement("mode").after(commandLine);
  }

  showMode(mode: string): void {
    this.write("mode", mode);
  }

  showAccount(email: string): void {
    this.write("account", email);
  }

  showLabel(label: string): void {
    this.write("label", label);
  }

  showSync(state: string): void {
    this.write("sync", state);
  }

  showWaiting(waiting: string): void {
    this.write("waiting", waiting);
  }

  showPendingKeys(keys: string): void {
    this.write("keys", keys);
  }

  showNotice(notice: string): void {
    this.message.show("notice", notice);
    this.expireMessages();
  }

  showError(message: string): void {
    this.message.show("error", message);
    this.expireMessages();
  }

  clearError(): void {
    this.message.clear("error");
  }

  clearMessages(): void {
    this.message.clear();
  }

  private expireMessages(): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.clearMessages(), this.messageLifetime);
  }

  read(field: StatusField): string {
    if (field === "notice" || field === "error") return this.message.read(field);
    return this.fieldElement(field).textContent ?? "";
  }

  private write(field: SegmentField, text: string): void {
    const element = this.fieldElement(field);
    if (element.textContent !== text) element.textContent = text;
  }

  private addFields(document: Document, fields: readonly SegmentField[]): void {
    for (const field of fields) this.fields.set(field, this.createField(document, field));
  }

  private createFill(document: Document): HTMLElement {
    const fill = document.createElement("span");
    fill.className = "status-bar-fill";
    return fill;
  }

  private createField(document: Document, field: SegmentField): HTMLElement {
    const element = document.createElement("span");
    element.className = field === "mode" ? "status-bar-mode" : "status-bar-segment";
    element.dataset["test"] = `status-${field}`;
    this.element.append(element);
    return element;
  }

  private fieldElement(field: SegmentField): HTMLElement {
    const element = this.fields.get(field);
    if (!element) throw new Error(`unknown status field ${field}`);
    return element;
  }
}
