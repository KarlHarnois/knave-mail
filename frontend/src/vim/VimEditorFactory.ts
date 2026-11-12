import { history } from "@codemirror/commands";
import { EditorState, type Extension } from "@codemirror/state";
import { drawSelection, EditorView } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { VimEditor, type VimEditorOptions } from "./VimEditor";
import type { VimExCommands } from "./VimExCommands";
import type { VimPrompts } from "./VimPrompts";

export class VimEditorFactory {
  constructor(
    private readonly commands: VimExCommands,
    private readonly prompts: VimPrompts,
  ) {}

  createReader(parent: HTMLElement, options: VimEditorOptions): VimEditor {
    return new VimEditor({
      parent,
      extensions: this.extensions(EditorState.readOnly.of(true)),
      commands: this.commands,
      prompts: this.prompts,
      options,
    });
  }

  createWriter(parent: HTMLElement, options: VimEditorOptions): VimEditor {
    return new VimEditor({
      parent,
      extensions: this.extensions(history()),
      commands: this.commands,
      prompts: this.prompts,
      options,
    });
  }

  private extensions(modeExtension: Extension): Extension[] {
    return [vim(), drawSelection(), EditorView.lineWrapping, modeExtension];
  }
}
