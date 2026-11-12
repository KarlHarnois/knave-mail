import type { MailSession } from "../mail/MailSession";
import type { SyncMonitor } from "../mail/SyncMonitor";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { StatusLine } from "../status/StatusLine";
import { type Command, CommandParser } from "./CommandParser";

export type CommandRunnerPorts = {
  session: MailSession;
  sync: SyncMonitor;
  errors: ErrorReporter;
  status: StatusLine;
  goBack: () => void;
  showList: () => void;
  showHelp: () => void;
};

type CommandHandlers = { [Kind in Command["kind"]]: (command: Extract<Command, { kind: Kind }>) => void };

export class CommandRunner {
  constructor(
    private readonly ports: CommandRunnerPorts,
    private readonly parser: CommandParser = new CommandParser(),
  ) {}

  run(input: string): void {
    this.execute(this.parser.parse(input));
  }

  private execute(command: Command): void {
    const handle = this.handlers[command.kind] as (command: Command) => void;
    handle(command);
  }

  private readonly handlers: CommandHandlers = {
    account: (command) => this.changeLocation(this.ports.session.selectAccount(command.email)),
    label: (command) => this.changeLocation(this.ports.session.goToLabelNamed(command.name)),
    sync: () => this.ports.sync.sync(),
    quit: () => this.ports.goBack(),
    help: () => this.ports.showHelp(),
    problem: (command) => this.ports.status.showError(command.message),
    empty: () => undefined,
  };

  private changeLocation(change: Promise<void>): void {
    this.ports.showList();
    this.ports.errors.run(change);
  }
}
