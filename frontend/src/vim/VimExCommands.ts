import { Vim } from "@replit/codemirror-vim";
import type { VimExHandler } from "./VimExHandler";

type ExCommandParameters = { argString?: string };
type KeyToExMapping = Parameters<typeof Vim._mapCommand>[0];

const FORCE_SUFFIX = "!";

export class VimExCommands {
  private static zzMapped = false;
  private readonly handlers = new WeakMap<object, VimExHandler>();

  install(): void {
    Vim.defineEx("write", "w", (cm) => this.handlerOf(cm)?.write());
    Vim.defineEx("wq", "wq", (cm) => this.handlerOf(cm)?.writeAndQuit());
    Vim.defineEx("xit", "x", (cm) => this.handlerOf(cm)?.writeAndQuit());
    Vim.defineEx("quit", "q", (cm, parameters) => this.handlerOf(cm)?.quit(this.isForced(parameters)));
    this.mapSaveAndQuitKeys();
  }

  register(editor: object, handler: VimExHandler): void {
    this.handlers.set(editor, handler);
  }

  unregister(editor: object): void {
    this.handlers.delete(editor);
  }

  private handlerOf(editor: object): VimExHandler | undefined {
    return this.handlers.get(editor);
  }

  private isForced(parameters: ExCommandParameters): boolean {
    return parameters.argString?.trim() === FORCE_SUFFIX;
  }

  private mapSaveAndQuitKeys(): void {
    if (VimExCommands.zzMapped) return;
    VimExCommands.zzMapped = true;
    const mapping = { keys: "ZZ", type: "keyToEx", exArgs: { input: "x" }, context: "normal" };
    Vim._mapCommand(mapping as unknown as KeyToExMapping);
  }
}
