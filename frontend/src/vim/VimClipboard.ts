import { type CodeMirror, Vim } from "@replit/codemirror-vim";
import type { SystemClipboard } from "./SystemClipboard";

type RegisterController = ReturnType<typeof Vim.getRegisterController>;

const PASTE_KEYS = new Set(["p", "P", "gp", "gP", "]p", "[p"]);

export class VimClipboard {
  private static readonly mirroredControllers = new WeakSet<RegisterController>();
  private static active: VimClipboard | null = null;
  private static pastesRouted = false;

  constructor(private readonly clipboard: SystemClipboard) {}

  install(): void {
    this.clipboard.ensureAvailable();
    VimClipboard.active = this;
    VimClipboard.routePastes();
    const controller = Vim.getRegisterController();
    if (VimClipboard.mirroredControllers.has(controller)) return;
    VimClipboard.mirroredControllers.add(controller);
    VimClipboard.mirrorUnnamedWrites(controller);
  }

  private static mirrorUnnamedWrites(controller: RegisterController): void {
    const pushText = controller.pushText.bind(controller);
    controller.pushText = (...pushed: Parameters<RegisterController["pushText"]>) => {
      pushText(...pushed);
      if (!pushed[0]) VimClipboard.active?.clipboard.write(controller.unnamedRegister.toString());
    };
  }

  private static routePastes(): void {
    if (VimClipboard.pastesRouted) return;
    VimClipboard.pastesRouted = true;
    const handleKey = Vim.handleKey.bind(Vim);
    Vim.handleKey = (cm, key, origin) => {
      const active = VimClipboard.active;
      if (!active || !VimClipboard.isPlainPaste(cm, key)) return handleKey(cm, key, origin);
      void active.pasteAfterReading(() => handleKey(cm, key, origin));
      return true;
    };
  }

  private static isPlainPaste(cm: CodeMirror, key: string): boolean {
    const vim = cm.state.vim;
    if (!vim || vim.insertMode) return false;
    const { inputState } = vim;
    if (inputState.registerName || inputState.operator) return false;
    return PASTE_KEYS.has(inputState.keyBuffer.join("") + key);
  }

  private async pasteAfterReading(paste: () => void): Promise<void> {
    const text = await this.clipboard.read();
    if (text !== null) this.holdInUnnamedRegister(text);
    paste();
  }

  private holdInUnnamedRegister(text: string): void {
    const unnamed = Vim.getRegisterController().unnamedRegister;
    if (unnamed.toString() !== text) unnamed.setText(text, text.endsWith("\n"));
  }
}
