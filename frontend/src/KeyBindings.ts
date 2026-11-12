export type SharedAction =
  | "openCommandLine"
  | "compose"
  | "archive"
  | "trash"
  | "toggleStar"
  | "toggleUnread"
  | "moveToInbox"
  | "undo"
  | "goToInbox"
  | "goToAllMail"
  | "nextAccount"
  | "previousAccount"
  | "refresh"
  | "clearError";

export type ListAction =
  | SharedAction
  | "moveDown"
  | "moveUp"
  | "moveToTop"
  | "moveToBottom"
  | "halfPageDown"
  | "halfPageUp"
  | "open"
  | "search"
  | "visualMode"
  | "escape";

export type ThreadAction =
  | SharedAction
  | "back"
  | "nextMessage"
  | "previousMessage"
  | "nextThread"
  | "previousThread"
  | "firstMessage"
  | "lastMessage"
  | "scrollDown"
  | "scrollUp"
  | "reply"
  | "replyAll"
  | "forward"
  | "toggleTextMode"
  | "loadRemoteImages";

export type Action = ListAction | ThreadAction;

export type KeyMode = "list" | "thread";

const SHARED_BINDINGS: ReadonlyArray<readonly [string, SharedAction]> = [
  [":", "openCommandLine"],
  ["c", "compose"],
  ["e", "archive"],
  ["#", "trash"],
  ["s", "toggleStar"],
  ["U", "toggleUnread"],
  ["I", "moveToInbox"],
  ["u", "undo"],
  ["gi", "goToInbox"],
  ["ga", "goToAllMail"],
  ["<C-n>", "nextAccount"],
  ["<C-p>", "previousAccount"],
  ["R", "refresh"],
  ["<Esc>", "clearError"],
];

export const LIST_BINDINGS: ReadonlyArray<readonly [string, ListAction]> = [
  ...SHARED_BINDINGS.filter(([key]) => key !== "<Esc>"),
  ["<Esc>", "escape"],
  ["V", "visualMode"],
  ["v", "visualMode"],
  ["j", "moveDown"],
  ["<Down>", "moveDown"],
  ["k", "moveUp"],
  ["<Up>", "moveUp"],
  ["gg", "moveToTop"],
  ["G", "moveToBottom"],
  ["<C-d>", "halfPageDown"],
  ["<C-u>", "halfPageUp"],
  ["l", "open"],
  ["<CR>", "open"],
  ["/", "search"],
];

export const THREAD_BINDINGS: ReadonlyArray<readonly [string, ThreadAction]> = [
  ...SHARED_BINDINGS,
  ["h", "back"],
  ["q", "back"],
  ["j", "nextMessage"],
  ["<Down>", "nextMessage"],
  ["k", "previousMessage"],
  ["J", "nextThread"],
  ["K", "previousThread"],
  ["<Up>", "previousMessage"],
  ["gg", "firstMessage"],
  ["G", "lastMessage"],
  ["<C-d>", "scrollDown"],
  ["<C-u>", "scrollUp"],
  ["r", "reply"],
  ["a", "replyAll"],
  ["f", "forward"],
  ["v", "toggleTextMode"],
  ["i", "loadRemoteImages"],
];
