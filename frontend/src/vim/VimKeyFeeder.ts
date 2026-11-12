import { deleteCharBackward } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import { type CodeMirror, Vim } from "@replit/codemirror-vim";

const INSERTED_TEXT: Readonly<Record<string, string>> = { "<CR>": "\n", "<Tab>": "\t" };
const VIM_KEY_NAMES: Readonly<Record<string, string>> = { " ": "<Space>" };

export class VimKeyFeeder {
  constructor(
    private readonly view: EditorView,
    private readonly cm: CodeMirror,
  ) {}

  press(token: string): void {
    const handled = Vim.handleKey(this.cm, VIM_KEY_NAMES[token] ?? token, "user");
    if (!handled && this.isInsertMode()) this.insert(token);
  }

  private insert(token: string): void {
    if (token === "<BS>") deleteCharBackward(this.view);
    else this.cm.replaceSelection(INSERTED_TEXT[token] ?? token);
  }

  private isInsertMode(): boolean {
    return this.cm.state.vim?.insertMode ?? false;
  }
}
