export type MailFont = { family: string; size: string };

export type MailFontSource = { font(): MailFont };

const DEFAULT_FONT: MailFont = { family: "system-ui, sans-serif", size: "14px" };

export class ThemeMailFont implements MailFontSource {
  constructor(private readonly document: Document) {}

  font(): MailFont {
    const probe = this.document.createElement("span");
    probe.style.fontFamily = "var(--message-font)";
    probe.style.fontSize = "var(--font-size)";
    this.document.body.append(probe);
    const style = getComputedStyle(probe);
    const font = { family: style.fontFamily || DEFAULT_FONT.family, size: style.fontSize || DEFAULT_FONT.size };
    probe.remove();
    return font;
  }
}

export const SYSTEM_MAIL_FONT: MailFontSource = { font: () => DEFAULT_FONT };
