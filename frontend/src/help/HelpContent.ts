import type { Action } from "../keys/KeyBindings";
import { LIST_BINDINGS, THREAD_BINDINGS } from "../keys/KeyBindings";
import { ACTION_DESCRIPTIONS } from "./ActionDescriptions";

export type HelpRow = { keys: string; description: string };
export type HelpSection = { title: string; rows: HelpRow[] };

const KEY_SEPARATOR = "  ";

const TEXT_READER_ROWS: HelpRow[] = [
  { keys: "vim motions, v V y", description: "Move, select and yank as in vim" },
  { keys: "y", description: "Yank to the system clipboard" },
  { keys: "<Esc> :q", description: "Leave the text reader" },
];

const COMPOSER_ROWS: HelpRow[] = [
  { keys: "y d c p", description: "Yank, delete, change and paste through the system clipboard" },
  { keys: "To: Cc: Subject:", description: "Edit the header lines; separate addresses with commas" },
  { keys: ":w", description: "Keep the draft" },
  { keys: ":x :wq ZZ", description: "Send" },
  { keys: ":q", description: "Leave, with a warning if the draft changed" },
  { keys: ":q!", description: "Discard the draft" },
];

const HELP_PAGE_ROWS: HelpRow[] = [
  { keys: "j k  gg G", description: "Move the cursor line; j and k take a count" },
  { keys: "<C-d> <C-u> <C-f> <C-b>", description: "Half a page or a page" },
  { keys: "/  n N", description: "Search the help, then the next or previous match" },
  { keys: "<Esc>", description: "Clear the search, or close the help" },
  { keys: "q ?", description: "Close the help" },
];

const COMMAND_ROWS: HelpRow[] = [
  { keys: ":account <email>", description: "Switch account" },
  { keys: ":label <name>", description: "Show a label" },
  { keys: ":labels", description: "Pick a label from a list" },
  { keys: ":sync", description: "Sync the current account" },
  { keys: ":archive-older <date>", description: "Archive every inbox thread older than a date like 2026/10/01" },
  { keys: ":help", description: "Show this help" },
  { keys: ":q", description: "Go back, or clear a search" },
];

export class HelpContent {
  sections(): HelpSection[] {
    return [
      { title: "Thread list", rows: this.rowsFor(LIST_BINDINGS) },
      { title: "Thread", rows: this.rowsFor(THREAD_BINDINGS) },
      { title: "Text reader (v in a thread)", rows: TEXT_READER_ROWS },
      { title: "Composer", rows: COMPOSER_ROWS },
      { title: "Command line (:)", rows: COMMAND_ROWS },
      { title: "Help page", rows: HELP_PAGE_ROWS },
    ];
  }

  private rowsFor(bindings: ReadonlyArray<readonly [string, Action]>): HelpRow[] {
    const keysByAction = new Map<Action, string[]>();
    for (const [key, action] of bindings) keysByAction.set(action, [...(keysByAction.get(action) ?? []), key]);
    return [...keysByAction].map(([action, keys]) => ({
      keys: keys.join(KEY_SEPARATOR),
      description: ACTION_DESCRIPTIONS[action],
    }));
  }
}
