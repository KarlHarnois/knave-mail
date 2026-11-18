import { CommandEntries } from "../commands/CommandEntries";
import type { CommandLine } from "../commands/CommandLine";
import type { CommandPalette } from "../commands/CommandPalette";
import { CommandRunner } from "../commands/CommandRunner";
import type { Action, KeyMode, SharedAction } from "../keys/KeyBindings";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { StatusLine } from "../status/StatusLine";
import { ALL_MAIL, INBOX, type LabelRef, SENT, SPAM } from "./LabelDirectory";
import type { MailSession } from "./MailSession";
import type { SyncMonitor } from "./SyncMonitor";

export type SharedActionPorts = {
  commandLine: CommandLine;
  palette: CommandPalette;
  pressKeys: (keys: string) => void;
  keyMode: () => KeyMode | null;
  session: MailSession;
  sync: SyncMonitor;
  errors: ErrorReporter;
  status: StatusLine;
  startCompose: () => void;
  showList: () => void;
  showHelp: () => void;
  pickLabel: () => void;
  goBack: () => void;
  archiveOlder: (before: string) => Promise<void>;
};

export class SharedActions {
  private readonly handlers: ReadonlyMap<Action, () => void>;
  private readonly commands: CommandRunner;

  constructor(private readonly ports: SharedActionPorts) {
    this.commands = new CommandRunner(ports);
    this.handlers = this.createHandlers();
  }

  handles(action: Action): boolean {
    return this.handlers.has(action);
  }

  perform(action: Action): void {
    this.handlers.get(action)?.();
  }

  goToLabel(label: LabelRef): void {
    this.changeLocation(this.ports.session.goToLabel(label));
  }

  startSearch(): void {
    this.ports.commandLine.open("/", (query) => this.changeLocation(this.ports.session.search(query)));
  }

  private createHandlers(): ReadonlyMap<SharedAction, () => void> {
    const { session, sync, status } = this.ports;
    return new Map<SharedAction, () => void>([
      ["openCommandLine", () => this.openPalette()],
      ["compose", () => this.ports.startCompose()],
      ["goToInbox", () => this.changeLocation(session.goToLabel(INBOX))],
      ["goToAllMail", () => this.changeLocation(session.goToLabel(ALL_MAIL))],
      ["goToSent", () => this.changeLocation(session.goToLabel(SENT))],
      ["goToSpam", () => this.changeLocation(session.goToLabel(SPAM))],
      ["pickLabel", () => this.ports.pickLabel()],
      ["nextAccount", () => this.changeLocation(session.cycleAccount(1))],
      ["previousAccount", () => this.changeLocation(session.cycleAccount(-1))],
      ["refresh", () => sync.sync()],
      ["showHelp", () => this.ports.showHelp()],
      ["clearError", () => status.clearError()],
    ]);
  }

  private openPalette(): void {
    const entries = new CommandEntries({
      runCommand: (input) => this.commands.run(input),
      pressKeys: this.ports.pressKeys,
      keyMode: this.ports.keyMode,
    });
    this.ports.palette.open({
      prompt: ":",
      mode: "COMMAND",
      takesArguments: true,
      entries: entries.all(),
      runTyped: (input) => this.commands.run(input),
    });
  }

  private changeLocation(change: Promise<void>): void {
    this.ports.showList();
    this.ports.errors.run(change);
  }
}
