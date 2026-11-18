import type { Screen } from "../app/Screen";
import type { ScreenHost } from "../app/ScreenHost";
import type { LabelDirectory, LabelRef } from "../mail/LabelDirectory";
import type { MailSession } from "../mail/MailSession";
import { CursorKeys } from "../rows/CursorKeys";
import { CursorRows } from "../rows/CursorRows";
import type { ErrorReporter } from "../status/ErrorReporter";
import { type LabelChoice, LabelChoices } from "./LabelChoices";

export type LabelPickerPorts = {
  document: Document;
  host: ScreenHost;
  labels: LabelDirectory;
  session: MailSession;
  errors: ErrorReporter;
  askSearch: (submit: (query: string) => void) => void;
  goToLabel: (label: LabelRef) => void;
};

export class LabelPickerScreen implements Screen {
  readonly keyMode = null;
  readonly element: HTMLElement;
  private readonly rows = new CursorRows();
  private readonly keys: CursorKeys;
  private choices: LabelChoice[] = [];
  private keysWhileLoading: string[] | null = null;

  constructor(private readonly ports: LabelPickerPorts) {
    this.element = ports.document.createElement("section");
    this.element.className = "label-picker";
    this.element.dataset["test"] = "label-picker";
    this.element.tabIndex = -1;
    this.keys = new CursorKeys({
      rows: this.rows,
      viewportHeight: () => this.element.clientHeight,
      askSearch: ports.askSearch,
      showError: (message) => ports.errors.report(new Error(`labels: ${message}`)),
      choose: (index) => this.choose(index),
      close: () => ports.host.back(),
    });
  }

  open(): void {
    this.keysWhileLoading = [];
    this.ports.host.push(this);
    this.ports.errors.run(this.load(), () => this.replayKeys());
  }

  modeName(): string {
    return "LABELS";
  }

  capturesKeys(): boolean {
    return true;
  }

  pressCaptured(token: string): void {
    if (this.keysWhileLoading) this.keysWhileLoading.push(token);
    else this.keys.press(token);
  }

  perform(): void {}

  focus(): void {
    this.element.focus({ preventScroll: true });
  }

  private async load(): Promise<void> {
    this.choices = new LabelChoices().from(await this.ports.labels.all(this.ports.session.account));
    this.rows.clear();
    this.element.replaceChildren(...this.choices.map((choice) => this.renderChoice(choice)));
    this.rows.moveTo(this.indexOfCurrent());
    this.replayKeys();
  }

  private replayKeys(): void {
    const waiting = this.keysWhileLoading ?? [];
    this.keysWhileLoading = null;
    for (const token of waiting) this.ports.host.press(token);
  }

  private choose(index: number): void {
    const choice = this.choices[index];
    if (!choice) return;
    this.ports.host.back();
    this.ports.goToLabel(choice.label);
  }

  private indexOfCurrent(): number {
    return Math.max(
      0,
      this.choices.findIndex((choice) => choice.label.id === this.ports.session.labelId),
    );
  }

  private renderChoice(choice: LabelChoice): HTMLElement {
    const row = this.ports.document.createElement("div");
    row.className = "label-row list-item";
    row.dataset["test"] = "label-row";
    const name = this.ports.document.createElement("span");
    name.className = "label-name";
    name.textContent = choice.label.name;
    const unread = this.ports.document.createElement("span");
    unread.className = "label-unread";
    unread.textContent = choice.unread ? String(choice.unread) : "";
    row.append(name, unread);
    this.rows.add(row, [name]);
    return row;
  }
}
