import type { CommandPalette, PaletteEntry } from "../commands/CommandPalette";
import type { LabelDirectory, LabelRef } from "../mail/LabelDirectory";
import type { MailSession } from "../mail/MailSession";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { StatusLine } from "../status/StatusLine";
import { type LabelChoice, LabelChoices } from "./LabelChoices";

export type LabelPalettePorts = {
  palette: CommandPalette;
  labels: LabelDirectory;
  session: MailSession;
  errors: ErrorReporter;
  status: StatusLine;
  goToLabel: (label: LabelRef) => void;
  opened: () => void;
};

export class LabelPalette {
  constructor(private readonly ports: LabelPalettePorts) {}

  open(): void {
    const choices = this.ports.labels.all(this.ports.session.account).then((labels) => new LabelChoices().from(labels));
    this.ports.palette.open({
      prompt: "label ",
      mode: "LABELS",
      takesArguments: false,
      entries: choices.then((loaded) => loaded.map((choice) => this.entry(choice))),
      runTyped: (text) => this.ports.status.showError(`no label matches ${text}`),
    });
  }

  private entry(choice: LabelChoice): PaletteEntry {
    return {
      name: choice.label.name,
      keys: choice.unread ? String(choice.unread) : "",
      takesArgument: false,
      isCurrent: choice.label.id === this.ports.session.labelId,
      run: () => this.ports.goToLabel(choice.label),
    };
  }
}
