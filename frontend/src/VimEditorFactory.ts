import { history } from "@codemirror/commands";
import { EditorState, type Extension } from "@codemirror/state";
import { drawSelection, EditorView } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { VimEditor, type VimEditorOptions } from "./VimEditor";
import type { VimExCommands } from "./VimExCommands";

export class VimEditorFactory {
  constructor(private readonly commands: VimExCommands) {}

  createReader(parent: HTMLElement, options: VimEditorOptions): VimEditor {
    return new VimEditor(parent, this.extensions(EditorState.readOnly.of(true)), this.commands, options);
  }

  createWriter(parent: HTMLElement, options: VimEditorOptions): VimEditor {
    return new VimEditor(parent, this.extensions(history()), this.commands, options);
  }

  private extensions(modeExtension: Extension): Extension[] {
    return [vim(), drawSelection(), EditorView.lineWrapping, modeExtension];
  }
}
