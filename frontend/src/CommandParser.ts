export type Command =
  | { kind: "account"; email: string }
  | { kind: "label"; name: string }
  | { kind: "sync" }
  | { kind: "quit" }
  | { kind: "empty" }
  | { kind: "problem"; message: string };

const COMMAND_SHAPE = /^:?\s*(\S*)\s*(.*)$/;

export class CommandParser {
  parse(input: string): Command {
    const [, name = "", argument = ""] = COMMAND_SHAPE.exec(input.trim()) ?? [];
    return this.commandNamed(name, argument.trim());
  }

  private commandNamed(name: string, argument: string): Command {
    switch (name) {
      case "":
        return { kind: "empty" };
      case "account":
        return this.withArgument(argument, "usage: :account <email>", (email) => ({ kind: "account", email }));
      case "label":
        return this.withArgument(argument, "usage: :label <name>", (labelName) => ({ kind: "label", name: labelName }));
      case "sync":
        return this.withoutArgument(argument, name, { kind: "sync" });
      case "q":
      case "quit":
        return this.withoutArgument(argument, name, { kind: "quit" });
      default:
        return { kind: "problem", message: `not a command: ${name}` };
    }
  }

  private withArgument(argument: string, usage: string, build: (argument: string) => Command): Command {
    return argument ? build(argument) : { kind: "problem", message: usage };
  }

  private withoutArgument(argument: string, name: string, command: Command): Command {
    return argument ? { kind: "problem", message: `:${name} takes no argument` } : command;
  }
}
