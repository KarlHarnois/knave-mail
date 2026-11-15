import type { Screen } from "../app/Screen";
import type { ScreenHost } from "../app/ScreenHost";
import type { MailClient } from "../bridge/MailClient";
import type { Draft } from "../bridge/Protocol";
import type { MailSession } from "../mail/MailSession";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { StatusLine } from "../status/StatusLine";
import type { VimEditor } from "../vim/VimEditor";
import type { VimEditorFactory } from "../vim/VimEditorFactory";
import type { VimExHandler } from "../vim/VimExHandler";
import { DraftFormat } from "./DraftFormat";
import { DraftSender } from "./DraftSender";

export type ComposePorts = {
  document: Document;
  host: ScreenHost;
  mail: MailClient;
  session: MailSession;
  errors: ErrorReporter;
  status: StatusLine;
  editors: VimEditorFactory;
  afterSending: () => void;
};

type KeptDraft = { text: string; replyTo: string | null };
type SendingDraft = { editor: VimEditor | null; kept: KeptDraft | null };

const EMPTY_DRAFT: Draft = { to: [], cc: [], subject: "", body: "", replyTo: null };
const NORMAL = "NORMAL";

export class ComposeScreen implements Screen, VimExHandler {
  readonly keyMode = null;
  readonly element: HTMLElement;
  private editor: VimEditor | null = null;
  private replyTo: string | null = null;
  private savedText = "";
  private kept: KeptDraft | null = null;
  private vimMode = NORMAL;
  private readonly sender: DraftSender;

  constructor(
    private readonly ports: ComposePorts,
    private readonly format: DraftFormat = new DraftFormat(),
  ) {
    this.sender = new DraftSender(ports);
    this.element = ports.document.createElement("section");
    this.element.className = "composer";
    this.element.dataset["test"] = "composer";
  }

  get keptDraft(): KeptDraft | null {
    return this.kept;
  }

  open(draft: Draft): void {
    this.start({ text: this.format.format(draft), replyTo: draft.replyTo });
    const cursorLine = draft.to.length > 0 ? this.format.separatorLine : this.format.recipientLine;
    this.editor?.moveCursorToEndOfLine(cursorLine);
  }

  resume(): void {
    if (this.kept) this.start(this.kept);
    else this.open(EMPTY_DRAFT);
  }

  modeName(): string {
    return `COMPOSE ${this.vimMode}`;
  }

  capturesKeys(): boolean {
    return true;
  }

  pressCaptured(token: string): void {
    this.editor?.press(token);
  }

  perform(): void {}

  focus(): void {
    this.editor?.focus();
  }

  write(): void {
    this.kept = { text: this.text(), replyTo: this.replyTo };
    this.savedText = this.kept.text;
    this.ports.status.showNotice("draft kept");
  }

  writeAndQuit(): void {
    this.send(this.format.parse(this.text(), this.replyTo));
  }

  quit(force: boolean): void {
    if (force) this.kept = null;
    if (force || !this.isDirty()) queueMicrotask(() => this.close());
    else this.ports.status.showError("unsaved changes: :w keeps the draft, :q! discards it");
  }

  private start(draft: KeptDraft): void {
    this.editor?.destroy();
    this.replyTo = draft.replyTo;
    this.savedText = draft.text;
    this.vimMode = NORMAL;
    this.editor = this.ports.editors.createWriter(this.element, {
      text: draft.text,
      handler: this,
      onModeChange: (mode) => this.showVimMode(mode),
    });
    this.ports.host.push(this);
    this.editor.focus();
  }

  private send(draft: Draft): void {
    const sending: SendingDraft = { editor: this.editor, kept: this.kept };
    this.sender.send(draft, () => this.finishSending(sending));
  }

  private finishSending(sending: SendingDraft): void {
    this.ports.status.showNotice("sent");
    if (this.kept === sending.kept) this.kept = null;
    if (this.editor === sending.editor) this.close();
    this.ports.errors.run(this.ports.session.reload());
    this.ports.afterSending();
  }

  private close(): void {
    this.editor?.destroy();
    this.editor = null;
    this.ports.host.back();
  }

  private isDirty(): boolean {
    return this.text() !== this.savedText;
  }

  private text(): string {
    return this.editor?.text() ?? "";
  }

  private showVimMode(mode: string): void {
    this.vimMode = mode;
    this.ports.host.refreshStatus();
  }
}
