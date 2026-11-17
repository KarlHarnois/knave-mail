type ThemeName = "light" | "dark";

type GlossaryEntry = {
  readonly id: string;
  readonly values: Readonly<Record<ThemeName, string>>;
};

const COLOR_TOKEN_FOR_KEY: readonly (readonly [string, string])[] = [
  ["background", "color.surface.base"],
  ["foreground", "color.text.primary"],
  ["muted", "color.text.secondary"],
  ["border", "color.border.default"],
  ["selection", "color.selection"],
  ["cursor", "color.focus"],
  ["accent", "color.focus"],
  ["error", "color.focus"],
  ["star", "color.focus"],
  ["status-bar", "color.surface.raised"],
  ["html-mail", "color.surface.document"],
];

const THEME_NAMES: readonly ThemeName[] = ["light", "dark"];
const INTERFACE_FONT_TOKEN = "font.family.mono";
const MESSAGE_FONT_TOKEN = "font.family.prose";
const FONT_SIZE_TOKEN = "font.size.body";
const INDENT = "       ";
const PIXELS = /^(\d+(?:\.\d+)?)px$/;

export class DesignSystemTheme {
  private readonly entries: ReadonlyMap<string, GlossaryEntry>;

  constructor(glossary: readonly GlossaryEntry[]) {
    this.entries = new Map(glossary.map((entry) => [entry.id, entry]));
  }

  render(): string {
    const lines = [
      `(theme :font ${this.quoted(this.firstFamily(INTERFACE_FONT_TOKEN))}`,
      `${INDENT}:message-font ${this.quoted(this.firstFamily(MESSAGE_FONT_TOKEN))}`,
      `${INDENT}:font-size ${this.fontSize()}`,
      ...THEME_NAMES.map((themeName) => `${INDENT}${this.section(themeName)}`),
    ];
    return `${lines.join("\n")})\n`;
  }

  private section(themeName: ThemeName): string {
    const continuation = `\n${INDENT} ${" ".repeat(themeName.length + 1)}`;
    const pairs = COLOR_TOKEN_FOR_KEY.map(([key, tokenId]) => `:${key} ${this.quoted(this.value(tokenId, themeName))}`);
    return `(${themeName} ${pairs.join(continuation)})`;
  }

  private firstFamily(tokenId: string): string {
    const [first = ""] = this.value(tokenId, "dark").split(",");
    return first.trim().replace(/^"|"$/g, "");
  }

  private fontSize(): string {
    const size = this.value(FONT_SIZE_TOKEN, "dark");
    const pixels = PIXELS.exec(size)?.[1];
    if (pixels === undefined) throw new Error(`${FONT_SIZE_TOKEN} is ${size}, but knave-mail needs pixels`);
    return pixels;
  }

  private value(tokenId: string, themeName: ThemeName): string {
    const entry = this.entries.get(tokenId);
    if (entry === undefined) throw new Error(`The design system glossary has no token ${tokenId}`);
    return entry.values[themeName];
  }

  private quoted(text: string): string {
    return `"${text}"`;
  }
}
