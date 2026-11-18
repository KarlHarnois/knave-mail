import { type Action, type KeyMode, LIST_BINDINGS, THREAD_BINDINGS } from "../keys/KeyBindings";
import type { PaletteEntry } from "./CommandPalette";

export type CommandEntriesPorts = {
  runCommand: (input: string) => void;
  pressKeys: (keys: string) => void;
  keyMode: () => KeyMode | null;
};

type ExCommand = { readonly name: string; readonly argument?: string; readonly action?: Action };

const EX_COMMANDS: readonly ExCommand[] = [
  { name: "sync", action: "refresh" },
  { name: "help", action: "showHelp" },
  { name: "labels", action: "pickLabel" },
  { name: "quit", action: "back" },
  { name: "label", argument: "<name>" },
  { name: "account", argument: "<email>" },
  { name: "archive-older", argument: "<yyyy/mm/dd>" },
];

const BINDINGS_BY_MODE: Readonly<Record<KeyMode, ReadonlyArray<readonly [string, Action]>>> = {
  list: LIST_BINDINGS,
  thread: THREAD_BINDINGS,
};

const NOT_LISTED: ReadonlySet<Action> = new Set<Action>([
  "openCommandLine",
  ...EX_COMMANDS.flatMap((command) => (command.action ? [command.action] : [])),
]);

const WORD_START = /(?=[A-Z])/;

export class CommandEntries {
  constructor(private readonly ports: CommandEntriesPorts) {}

  all(): PaletteEntry[] {
    const keys = this.firstKeys();
    return [...EX_COMMANDS.map((command) => this.exEntry(command, keys)), ...this.actionEntries(keys)];
  }

  private exEntry(command: ExCommand, keys: ReadonlyMap<Action, string>): PaletteEntry {
    const hint = command.argument ?? (command.action ? (keys.get(command.action) ?? "") : "");
    return {
      name: command.name,
      keys: hint,
      takesArgument: command.argument !== undefined,
      run: () => this.ports.runCommand(command.name),
    };
  }

  private actionEntries(keys: ReadonlyMap<Action, string>): PaletteEntry[] {
    return [...keys]
      .filter(([action]) => !NOT_LISTED.has(action))
      .map(([action, key]) => ({
        name: this.kebab(action),
        keys: key,
        takesArgument: false,
        run: () => this.ports.pressKeys(key),
      }));
  }

  private firstKeys(): ReadonlyMap<Action, string> {
    const mode = this.ports.keyMode();
    const bindings = mode ? BINDINGS_BY_MODE[mode] : [];
    const keys = new Map<Action, string>();
    for (const [key, action] of bindings) if (!keys.has(action)) keys.set(action, key);
    return keys;
  }

  private kebab(action: Action): string {
    return action.split(WORD_START).join("-").toLowerCase();
  }
}
