import type { CommandLine } from "./CommandLine";
import type { CommandRunner } from "./CommandRunner";
import type { ErrorReporter } from "./ErrorReporter";
import type { Action, SharedAction } from "./KeyBindings";
import { ALL_MAIL, INBOX } from "./LabelDirectory";
import type { MailSession } from "./MailSession";
import type { StatusLine } from "./StatusLine";
import type { SyncMonitor } from "./SyncMonitor";

export type SharedActionPorts = {
  commandLine: CommandLine;
  commands: CommandRunner;
  session: MailSession;
  sync: SyncMonitor;
  errors: ErrorReporter;
  status: StatusLine;
  startCompose: () => void;
  showList: () => void;
};

export class SharedActions {
  private readonly handlers: ReadonlyMap<Action, () => void>;

  constructor(private readonly ports: SharedActionPorts) {
    this.handlers = this.createHandlers();
  }

  handles(action: Action): boolean {
    return this.handlers.has(action);
  }

  perform(action: Action): void {
    this.handlers.get(action)?.();
  }

  startSearch(): void {
    this.ports.commandLine.open("/", (query) => this.changeLocation(this.ports.session.search(query)));
  }

  private createHandlers(): ReadonlyMap<SharedAction, () => void> {
    const { commandLine, commands, session, sync, status } = this.ports;
    return new Map<SharedAction, () => void>([
      ["openCommandLine", () => commandLine.open(":", (input) => commands.run(input))],
      ["compose", () => this.ports.startCompose()],
      ["goToInbox", () => this.changeLocation(session.goToLabel(INBOX))],
      ["goToAllMail", () => this.changeLocation(session.goToLabel(ALL_MAIL))],
      ["nextAccount", () => this.changeLocation(session.cycleAccount(1))],
      ["previousAccount", () => this.changeLocation(session.cycleAccount(-1))],
      ["refresh", () => sync.sync()],
      ["clearError", () => status.clearError()],
    ]);
  }

  private changeLocation(change: Promise<void>): void {
    this.ports.showList();
    this.ports.errors.run(change);
  }
}
