import { Vim } from "@replit/codemirror-vim";
import type { SystemClipboard } from "./SystemClipboard";

type RegisterController = ReturnType<typeof Vim.getRegisterController>;

export class VimClipboard {
  private static readonly mirroredControllers = new WeakSet<RegisterController>();
  private static activeClipboard: SystemClipboard | null = null;

  constructor(private readonly clipboard: SystemClipboard) {}

  install(): void {
    this.clipboard.ensureAvailable();
    VimClipboard.activeClipboard = this.clipboard;
    const controller = Vim.getRegisterController();
    if (VimClipboard.mirroredControllers.has(controller)) return;
    VimClipboard.mirroredControllers.add(controller);
    VimClipboard.mirrorUnnamedYanks(controller);
  }

  private static mirrorUnnamedYanks(controller: RegisterController): void {
    const pushText = controller.pushText.bind(controller);
    controller.pushText = (registerName, operator, text, linewise, blockwise) => {
      pushText(registerName, operator, text, linewise, blockwise);
      if (!registerName && operator === "yank") VimClipboard.activeClipboard?.write(text);
    };
  }
}
