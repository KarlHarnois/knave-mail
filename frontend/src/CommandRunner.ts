import { type Command, CommandParser } from "./CommandParser";
import type { ErrorReporter } from "./ErrorReporter";
import type { MailSession } from "./MailSession";
import type { StatusLine } from "./StatusLine";
import type { SyncMonitor } from "./SyncMonitor";

export type CommandRunnerPorts = {
  session: MailSession;
  sync: SyncMonitor;
  errors: ErrorReporter;
  status: StatusLine;
  goBack: () => void;
  showList: () => void;
};

export class CommandRunner {
  constructor(
    private readonly ports: CommandRunnerPorts,
    private readonly parser = new CommandParser(),
  ) {}

  run(input: string): void {
    this.execute(this.parser.parse(input));
  }

  private execute(command: Command): void {
    switch (command.kind) {
      case "account":
        this.changeLocation(this.ports.session.selectAccount(command.email));
        return;
      case "label":
        this.changeLocation(this.ports.session.goToLabelNamed(command.name));
        return;
      case "sync":
        this.ports.sync.sync();
        return;
      case "quit":
        this.ports.goBack();
        return;
      case "problem":
        this.ports.status.showError(command.message);
        return;
      case "empty":
        return;
    }
  }

  private changeLocation(change: Promise<void>): void {
    this.ports.showList();
    this.ports.errors.run(change);
  }
}
