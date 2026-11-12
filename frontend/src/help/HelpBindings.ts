export type HelpAction =
  | "down"
  | "up"
  | "top"
  | "bottom"
  | "halfPageDown"
  | "halfPageUp"
  | "pageDown"
  | "pageUp"
  | "search"
  | "nextMatch"
  | "previousMatch"
  | "escape"
  | "close";

export const HELP_BINDINGS: ReadonlyArray<readonly [string, HelpAction]> = [
  ["j", "down"],
  ["<Down>", "down"],
  ["k", "up"],
  ["<Up>", "up"],
  ["gg", "top"],
  ["G", "bottom"],
  ["<C-d>", "halfPageDown"],
  ["<C-u>", "halfPageUp"],
  ["<C-f>", "pageDown"],
  ["<C-b>", "pageUp"],
  ["/", "search"],
  ["n", "nextMatch"],
  ["N", "previousMatch"],
  ["<Esc>", "escape"],
  ["q", "close"],
  ["?", "close"],
];
