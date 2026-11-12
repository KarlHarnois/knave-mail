import { deleteCharBackward } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import { type CodeMirror, Vim } from "@replit/codemirror-vim";

const INSERTED_TEXT: Readonly<Record<string, string>> = { "<CR>": "\n", "<Tab>": "\t" };
const VIM_KEY_NAMES: Readonly<Record<string, string>> = { " ": "<Space>" };
const EX_PROMPT = ":";

export class VimKeyFeeder {
  private exInput: string | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly cm: CodeMirror,
  ) {}

  get isTypingExCommand(): boolean {
    return this.exInput !== null;
  }

  press(token: string): void {
    if (this.exInput !== null) this.pressInExPrompt(token);
    else if (token === EX_PROMPT && !this.isInsertMode()) this.exInput = "";
    else this.pressInEditor(token);
  }

  private pressInExPrompt(token: string): void {
    if (token === "<CR>") this.runEx();
    else if (token === "<Esc>") this.exInput = null;
    else if (token === "<BS>") this.exInput = this.exInput?.slice(0, -1) ?? null;
    else if (token.length === 1) this.exInput += token;
  }

  private runEx(): void {
    const input = this.exInput ?? "";
    this.exInput = null;
    Vim.handleEx(this.cm as Parameters<typeof Vim.handleEx>[0], input);
  }

  private pressInEditor(token: string): void {
    const handled = Vim.handleKey(this.cm, VIM_KEY_NAMES[token] ?? token, "user");
    if (!handled && this.isInsertMode()) this.insert(token);
  }

  private insert(token: string): void {
    if (token === "<BS>") deleteCharBackward(this.view);
    else this.view.dispatch(this.view.state.replaceSelection(INSERTED_TEXT[token] ?? token));
  }

  private isInsertMode(): boolean {
    return this.cm.state.vim?.insertMode ?? false;
  }
}
