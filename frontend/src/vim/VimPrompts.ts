import type { CodeMirror } from "@replit/codemirror-vim";
import type { CommandLine, PromptOptions, PromptSymbol } from "../commands/CommandLine";
import { MatchCount } from "../commands/MatchCount";
import type { StatusLine } from "../status/StatusLine";

type DialogCallback = ((text: string) => void) | undefined;
type DialogEditor = { readonly cm: CodeMirror; readonly refocus: () => void };

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
      this.dialog(template, callback, { cm, refocus });
    adapter["openNotification"] = (template: HTMLElement) => this.notify(template);
  }

  private dialog(template: HTMLElement, callback: DialogCallback, editor: DialogEditor): () => void {
    const input = template.querySelector("input");
    if (!input) return this.notify(template);
    this.leaveEditor();
    const prompt = this.promptOf(input);
    this.ports.commandLine.open(prompt, (text) => callback?.(text), this.optionsFor(editor, prompt));
    return () => this.ports.commandLine.cancel();
  }

  private optionsFor(editor: DialogEditor, prompt: PromptSymbol): PromptOptions {
    if (prompt === DEFAULT_PROMPT) return { closed: editor.refocus };
    return { closed: editor.refocus, counter: (text) => this.matchCount(editor.cm, text) };
  }

  private matchCount(cm: CodeMirror, text: string): string {
    const document = cm.getValue();
    const starts: number[] = [];
    for (let at = document.indexOf(text); at !== -1; at = document.indexOf(text, at + 1)) starts.push(at);
    return MatchCount.of(starts, cm.indexFromPos(cm.getCursor()) + 1).text();
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
