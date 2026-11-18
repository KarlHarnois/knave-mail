export type Command =
  | { kind: "account"; email: string }
  | { kind: "label"; name: string }
  | { kind: "archive-older"; before: string }
  | { kind: "sync" }
  | { kind: "quit" }
  | { kind: "help" }
  | { kind: "labels" }
  | { kind: "empty" }
  | { kind: "problem"; message: string };

const COMMAND_SHAPE = /^:?\s*(\S*)\s*(.*)$/;

type ArgumentCommand = { usage: string; build: (argument: string) => Command };

export class CommandParser {
  private static readonly argumentCommands: Readonly<Record<string, ArgumentCommand>> = {
    account: { usage: "usage: :account <email>", build: (email) => ({ kind: "account", email }) },
    label: { usage: "usage: :label <name>", build: (name) => ({ kind: "label", name }) },
    "archive-older": {
      usage: "usage: :archive-older <yyyy/mm/dd>",
      build: (before) => ({ kind: "archive-older", before }),
    },
  };

  private static readonly plainCommands: ReadonlySet<string> = new Set(["sync", "q", "quit", "labels", "h", "help"]);

  knows(input: string): boolean {
    const [, name = ""] = COMMAND_SHAPE.exec(input.trim()) ?? [];
    return name in CommandParser.argumentCommands || CommandParser.plainCommands.has(name);
  }

  parse(input: string): Command {
    const [, name = "", argument = ""] = COMMAND_SHAPE.exec(input.trim()) ?? [];
    return this.commandNamed(name, argument.trim());
  }

  private commandNamed(name: string, argument: string): Command {
    const withArgument = CommandParser.argumentCommands[name];
    if (withArgument) return argument ? withArgument.build(argument) : { kind: "problem", message: withArgument.usage };
    switch (name) {
      case "":
        return { kind: "empty" };
      case "sync":
        return this.withoutArgument(argument, name, { kind: "sync" });
      case "q":
      case "quit":
        return this.withoutArgument(argument, name, { kind: "quit" });
      case "labels":
        return this.withoutArgument(argument, name, { kind: "labels" });
      case "h":
      case "help":
        return this.withoutArgument(argument, name, { kind: "help" });
      default:
        return { kind: "problem", message: `not a command: ${name}` };
    }
  }

  private withoutArgument(argument: string, name: string, command: Command): Command {
    return argument ? { kind: "problem", message: `:${name} takes no argument` } : command;
  }
}
