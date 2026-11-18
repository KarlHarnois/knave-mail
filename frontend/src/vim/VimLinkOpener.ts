import { type CodeMirror, Vim } from "@replit/codemirror-vim";
import type { MailClient } from "../bridge/MailClient";

type LinkOpener = Pick<MailClient, "openLink">;

const WEB_URL = /https?:\/\/[^\s<>"'()[\]]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
const ACTION_NAME = "openLinkUnderCursor";

export class VimLinkOpener {
  private static active: VimLinkOpener | null = null;
  private static mapped = false;

  constructor(private readonly opener: LinkOpener) {}

  install(): void {
    VimLinkOpener.active = this;
    if (VimLinkOpener.mapped) return;
    VimLinkOpener.mapped = true;
    Vim.defineAction(ACTION_NAME, (cm) => VimLinkOpener.active?.openUnderCursor(cm));
    Vim.mapCommand("gx", "action", ACTION_NAME, {}, { context: "normal" });
  }

  private openUnderCursor(cm: CodeMirror): void {
    const cursor = cm.getCursor();
    const url = this.urlAt(cm.getLine(cursor.line), cursor.ch);
    if (url) this.opener.openLink(url);
  }

  private urlAt(line: string, column: number): string | null {
    const covering = [...line.matchAll(WEB_URL)].find(
      (match) => match.index <= column && column < match.index + match[0].length,
    );
    return covering ? covering[0].replace(TRAILING_PUNCTUATION, "") : null;
  }
}
