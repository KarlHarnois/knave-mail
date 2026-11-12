import type { ScreenHost } from "../app/ScreenHost";
import type { VimExHandler } from "../vim/VimExHandler";
import type { MessageCard } from "./MessageCard";

const NORMAL = "NORMAL";

export class ThreadTextMode implements VimExHandler {
  private card: MessageCard | null = null;
  private vimMode = NORMAL;

  constructor(
    private readonly host: ScreenHost,
    private readonly restoreFocus: () => void,
  ) {}

  get isActive(): boolean {
    return this.card !== null;
  }

  modeName(): string {
    return `TEXT ${this.vimMode}`;
  }

  enter(card: MessageCard): void {
    this.card = card;
    this.vimMode = NORMAL;
    card.enterTextMode({
      handler: this,
      onEscapeInNormalMode: () => this.leave(),
      onModeChange: (mode) => this.showVimMode(mode),
    });
    this.host.refreshStatus();
  }

  leave(): void {
    if (!this.card) return;
    this.card.leaveTextMode();
    this.card = null;
    this.restoreFocus();
    this.host.refreshStatus();
  }

  press(token: string): void {
    this.card?.pressInReader(token);
  }

  write(): void {}

  writeAndQuit(): void {
    queueMicrotask(() => this.leave());
  }

  quit(): void {
    queueMicrotask(() => this.leave());
  }

  private showVimMode(mode: string): void {
    this.vimMode = mode;
    this.host.refreshStatus();
  }
}
