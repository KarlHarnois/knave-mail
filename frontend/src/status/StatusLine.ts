export type StatusField = "mode" | "account" | "label" | "sync" | "waiting" | "keys" | "notice" | "error";

const FIELD_ORDER: readonly StatusField[] = ["mode", "account", "label", "sync", "waiting", "keys", "notice", "error"];
const MESSAGE_LIFETIME_MILLISECONDS = 8000;

export class StatusLine {
  readonly element: HTMLElement;
  private readonly fields = new Map<StatusField, HTMLElement>();
  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    document: Document,
    private readonly messageLifetime: number = MESSAGE_LIFETIME_MILLISECONDS,
  ) {
    this.element = document.createElement("footer");
    this.element.className = "status-line";
    this.element.dataset["test"] = "status-line";
    for (const field of FIELD_ORDER) this.fields.set(field, this.createField(document, field));
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
    this.write("notice", notice);
    this.expireMessages();
  }

  showError(message: string): void {
    this.write("notice", "");
    this.write("error", message);
    this.expireMessages();
  }

  clearError(): void {
    this.write("error", "");
  }

  clearMessages(): void {
    this.write("notice", "");
    this.write("error", "");
  }

  private expireMessages(): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.clearMessages(), this.messageLifetime);
  }

  read(field: StatusField): string {
    return this.fieldElement(field).textContent ?? "";
  }

  private write(field: StatusField, text: string): void {
    const element = this.fieldElement(field);
    if (element.textContent !== text) element.textContent = text;
  }

  private createField(document: Document, field: StatusField): HTMLElement {
    const element = document.createElement("span");
    element.className = `status-${field}`;
    element.dataset["test"] = `status-${field}`;
    this.element.append(element);
    return element;
  }

  private fieldElement(field: StatusField): HTMLElement {
    const element = this.fields.get(field);
    if (!element) throw new Error(`unknown status field ${field}`);
    return element;
  }
}
