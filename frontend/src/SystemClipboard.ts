import { MemoryClipboard } from "./MemoryClipboard";

type ClipboardHost = { clipboard?: Pick<Clipboard, "writeText" | "readText"> };

export class SystemClipboard {
  constructor(
    private readonly host: ClipboardHost,
    private readonly reportError: (message: string) => void,
  ) {}

  ensureAvailable(): void {
    if (this.host.clipboard) return;
    Object.defineProperty(this.host, "clipboard", { value: new MemoryClipboard(), configurable: true });
  }

  write(text: string): void {
    this.host.clipboard
      ?.writeText(text)
      .catch((error: unknown) => this.reportError(`clipboard: ${String(error)}`));
  }
}
