export type CursorAction =
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
  | "choose"
  | "escape"
  | "close";

export const CURSOR_BINDINGS: ReadonlyArray<readonly [string, CursorAction]> = [
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
  ["<CR>", "choose"],
  ["l", "choose"],
  ["<Esc>", "escape"],
  ["q", "close"],
];
