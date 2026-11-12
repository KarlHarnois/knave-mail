import { MemoryClipboard } from "./MemoryClipboard";

type ClipboardHost = { clipboard?: Pick<Clipboard, "writeText" | "readText"> };

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

  private keepInMemory(text: string, error: unknown): void {
    this.reportError(`system clipboard unavailable, yanks stay inside knave-mail: ${String(error)}`);
    this.useMemoryClipboard();
    void this.host.clipboard?.writeText(text);
  }

  private useMemoryClipboard(): void {
    Object.defineProperty(this.host, "clipboard", { value: new MemoryClipboard(), configurable: true });
  }
}
