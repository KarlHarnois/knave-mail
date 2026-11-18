type ThemeName = "light" | "dark";

export type GlossaryEntry = {
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
const FONT_TOKEN_FOR_PROPERTY: readonly (readonly [string, string])[] = [
  ["--theme-font", "font.family.mono"],
  ["--theme-message-font", "font.family.prose"],
  ["--font-size", "font.size.body"],
];
const THEME_INDEPENDENT_VALUES: ThemeName = "dark";

export class DesignSystemTheme {
  private readonly entries: ReadonlyMap<string, GlossaryEntry>;

  constructor(glossary: readonly GlossaryEntry[]) {
    this.entries = new Map(glossary.map((entry) => [entry.id, entry]));
  }

  css(): string {
    const declarations = [...this.fontDeclarations(), ...THEME_NAMES.flatMap((name) => this.colorDeclarations(name))];
    return `:root {\n${declarations.map((declaration) => `  ${declaration};`).join("\n")}\n}\n`;
  }

  private fontDeclarations(): string[] {
    return FONT_TOKEN_FOR_PROPERTY.map(
      ([property, tokenId]) => `${property}: ${this.value(tokenId, THEME_INDEPENDENT_VALUES)}`,
    );
  }

  private colorDeclarations(themeName: ThemeName): string[] {
    return COLOR_TOKEN_FOR_KEY.map(([key, tokenId]) => `--${themeName}-${key}: ${this.value(tokenId, themeName)}`);
  }

  private value(tokenId: string, themeName: ThemeName): string {
    const entry = this.entries.get(tokenId);
    if (entry === undefined) throw new Error(`The design system glossary has no token ${tokenId}`);
    return entry.values[themeName];
  }
}
