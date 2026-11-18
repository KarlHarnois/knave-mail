import { MemoryClipboard } from "./MemoryClipboard";

type BrowserClipboard = Pick<Clipboard, "writeText" | "readText">;
type ClipboardHost = { clipboard?: BrowserClipboard };

const READ_TIMEOUT_MILLISECONDS = 500;

export class SystemClipboard {
  constructor(
    private readonly host: ClipboardHost,
    private readonly reportError: (message: string) => void,
  ) {}

  ensureAvailable(): void {
    if (this.host.clipboard) return;
    this.useMemoryClipboard();
  }

  write(text: string): void {
    this.host.clipboard?.writeText(text).catch((error: unknown) => this.keepInMemory(text, error));
  }

  async read(): Promise<string | null> {
    const clipboard = this.host.clipboard;
    if (!clipboard) return null;
    try {
      return await this.readWithinTimeout(clipboard);
    } catch (error) {
      this.reportError(`system clipboard unreadable, p pastes the last yank instead: ${String(error)}`);
      return null;
    }
  }

  private async readWithinTimeout(clipboard: BrowserClipboard): Promise<string> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`no answer after ${READ_TIMEOUT_MILLISECONDS}ms`)),
        READ_TIMEOUT_MILLISECONDS,
      );
    });
    try {
      return await Promise.race([clipboard.readText(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private keepInMemory(text: string, error: unknown): void {
    this.reportError(`system clipboard unavailable, yanks stay inside knave-mail: ${String(error)}`);
    this.useMemoryClipboard();
    void this.host.clipboard?.writeText(text);
  }

  private useMemoryClipboard(): void {
    Object.defineProperty(this.host, "clipboard", { value: new MemoryClipboard(), configurable: true });
  }
}
