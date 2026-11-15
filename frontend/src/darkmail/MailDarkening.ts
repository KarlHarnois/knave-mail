import { ColorTone } from "./ColorTone";

export type MailColors = { background: string; foreground: string };

export type MailColorSource = { colors(): MailColors | null };

const DARK_MAIL_PROPERTY = "--dark-mail";
const OFF = "off";

export class MailDarkening implements MailColorSource {
  private readonly tone = new ColorTone();

  constructor(private readonly document: Document) {}

  colors(): MailColors | null {
    const root = this.document.documentElement;
    if (getComputedStyle(root).getPropertyValue(DARK_MAIL_PROPERTY).trim() === OFF) return null;
    const background = this.resolve("--background");
    return this.tone.isDark(background) ? { background, foreground: this.resolve("--foreground") } : null;
  }

  private resolve(variable: string): string {
    const probe = this.document.createElement("span");
    probe.style.color = `var(${variable})`;
    this.document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }
}
