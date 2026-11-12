import type { CodeMirror } from "@replit/codemirror-vim";
import type { CommandLine, PromptSymbol } from "../commands/CommandLine";
import type { StatusLine } from "../status/StatusLine";

type DialogCallback = ((text: string) => void) | undefined;

const PROMPTS: ReadonlySet<string> = new Set([":", "/", "?"]);
const DEFAULT_PROMPT: PromptSymbol = ":";

export type VimPromptsPorts = {
  document: Document;
  commandLine: CommandLine;
  status: StatusLine;
};

export class VimPrompts {
  constructor(private readonly ports: VimPromptsPorts) {}

  install(cm: CodeMirror, refocus: () => void): void {
    const adapter = cm as unknown as Record<string, unknown>;
    adapter["openDialog"] = (template: HTMLElement, callback: DialogCallback) =>
      this.dialog(template, callback, refocus);
    adapter["openNotification"] = (template: HTMLElement) => this.notify(template);
  }

  private dialog(template: HTMLElement, callback: DialogCallback, refocus: () => void): () => void {
    const input = template.querySelector("input");
    if (!input) return this.notify(template);
    this.leaveEditor();
    this.ports.commandLine.open(this.promptOf(input), (text) => callback?.(text), refocus);
    return () => this.ports.commandLine.cancel();
  }

  private notify(template: HTMLElement): () => void {
    this.ports.status.showNotice((template.textContent ?? "").trim());
    return () => this.ports.status.clearMessages();
  }

  private promptOf(input: HTMLInputElement): PromptSymbol {
    const prefix = (input.parentElement?.textContent ?? "").trim();
    return PROMPTS.has(prefix) ? (prefix as PromptSymbol) : DEFAULT_PROMPT;
  }

  private leaveEditor(): void {
    const active = this.ports.document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }
}
