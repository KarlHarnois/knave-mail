export type MailColors = { background: string; foreground: string };

export type MailColorSource = { colors(): MailColors | null };

const DARK_MAIL_PROPERTY = "--dark-mail";
const OFF = "off";
const LUMINANCE_SPLIT = 0.5;
const COLOR_CHANNELS = 3;
const CHANNEL_MAXIMUM = 255;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;

export class MailDarkening implements MailColorSource {
  constructor(private readonly document: Document) {}

  colors(): MailColors | null {
    const root = this.document.documentElement;
    if (getComputedStyle(root).getPropertyValue(DARK_MAIL_PROPERTY).trim() === OFF) return null;
    const background = this.resolve("--background");
    return this.isDark(background) ? { background, foreground: this.resolve("--foreground") } : null;
  }

  private resolve(variable: string): string {
    const probe = this.document.createElement("span");
    probe.style.color = `var(${variable})`;
    this.document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }

  private isDark(color: string): boolean {
    const channels =
      color
        .match(/\d+(\.\d+)?/g)
        ?.slice(0, COLOR_CHANNELS)
        .map(Number) ?? [];
    const [red = CHANNEL_MAXIMUM, green = CHANNEL_MAXIMUM, blue = CHANNEL_MAXIMUM] = channels;
    const luminance = (RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue) / CHANNEL_MAXIMUM;
    return luminance < LUMINANCE_SPLIT;
  }
}
