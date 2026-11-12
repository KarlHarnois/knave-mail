import type { Extension } from "@codemirror/state";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { type CodeMirror, getCM } from "@replit/codemirror-vim";
import type { VimExCommands } from "./VimExCommands";
import type { VimExHandler } from "./VimExHandler";
import { VimKeyFeeder } from "./VimKeyFeeder";

export type VimEditorOptions = {
  text: string;
  handler: VimExHandler;
  onModeChange?: (mode: string) => void;
  onEscapeInNormalMode?: () => void;
};

type ModeChange = { mode: string; subMode?: string };

export type VimEditorParts = {
  parent: HTMLElement;
  extensions: Extension[];
  commands: VimExCommands;
  options: VimEditorOptions;
};

export class VimEditor {
  readonly view: EditorView;
  private readonly cm: CodeMirror;
  private readonly feeder: VimKeyFeeder;

  private readonly commands: VimExCommands;
  private readonly options: VimEditorOptions;

  constructor({ parent, extensions, commands, options }: VimEditorParts) {
    this.commands = commands;
    this.options = options;
    this.view = new EditorView({ parent, state: EditorState.create({ doc: options.text, extensions }) });
    this.cm = this.vimAdapter();
    this.feeder = new VimKeyFeeder(this.view, this.cm);
    commands.register(this.cm, options.handler);
    this.cm.on("vim-mode-change", (change: ModeChange) => this.reportMode(change));
    this.view.dom.addEventListener("keydown", (event) => this.interceptEscape(event), true);
  }

  text(): string {
    return this.view.state.doc.toString();
  }

  moveCursorToEndOfLine(lineNumber: number): void {
    const doc = this.view.state.doc;
    const line = doc.line(Math.min(Math.max(1, lineNumber), doc.lines));
    this.view.dispatch({ selection: { anchor: line.to } });
  }

  focus(): void {
    this.view.focus();
  }

  press(token: string): void {
    if (token === "<Esc>" && this.isIdleInNormalMode()) this.options.onEscapeInNormalMode?.();
    else this.feeder.press(token);
  }

  destroy(): void {
    this.commands.unregister(this.cm);
    this.view.destroy();
  }

  private isIdleInNormalMode(): boolean {
    if (this.isPrompting() || this.feeder.isTypingExCommand) return false;
    const vim = this.cm.state.vim;
    if (!vim) return true;
    return !vim.insertMode && !vim.visualMode && vim.inputState.keyBuffer.length === 0;
  }

  private isPrompting(): boolean {
    return this.cm.state.dialog?.querySelector("input") != null;
  }

  private interceptEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !this.options.onEscapeInNormalMode || !this.isIdleInNormalMode()) return;
    event.preventDefault();
    event.stopPropagation();
    this.options.onEscapeInNormalMode();
  }

  private reportMode(change: ModeChange): void {
    const mode = change.subMode ? `${change.mode} ${change.subMode}` : change.mode;
    this.options.onModeChange?.(mode.toUpperCase());
  }

  private vimAdapter(): CodeMirror {
    const cm = getCM(this.view);
    if (!cm) throw new Error("the vim extension is missing from the editor");
    return cm;
  }
}
