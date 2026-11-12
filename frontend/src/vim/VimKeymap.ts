import { Vim } from "@replit/codemirror-vim";

export type KeymapMode = "normal" | "insert" | "visual";
export type KeymapEntry = { mode: KeymapMode; keys: string; action: string };

type KeymapWindow = Window & { knaveKeymap?: KeymapEntry[] };

export class VimKeymap {
  apply(entries: readonly KeymapEntry[]): void {
    for (const entry of entries) Vim.noremap(entry.keys, entry.action, entry.mode);
  }

  entriesOf(window: Window): KeymapEntry[] {
    return (window as KeymapWindow).knaveKeymap ?? [];
  }
}
