export type StatusField = "mode" | "account" | "label" | "sync" | "keys" | "notice" | "error";

const FIELD_ORDER: readonly StatusField[] = ["mode", "account", "label", "sync", "keys", "notice", "error"];

export class StatusLine {
  readonly element: HTMLElement;
  private readonly fields = new Map<StatusField, HTMLElement>();

  constructor(document: Document) {
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

  showPendingKeys(keys: string): void {
    this.write("keys", keys);
  }

  showNotice(notice: string): void {
    this.write("notice", notice);
  }

  showError(message: string): void {
    this.write("notice", "");
    this.write("error", message);
  }

  clearError(): void {
    this.write("error", "");
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
