import { describe, expect, test } from "bun:test";
import { DesignSystemTheme } from "../../tools/DesignSystemTheme";
import glossary from "./fixtures/glossary.json";

const EXPECTED_CSS = `:root {
  --default-font: "Fixture Mono", "Fixture Term", monospace;
  --default-message-font: "Fixture Sans", sans-serif;
  --font-size: 10px;
  --light-background: #ffffff;
  --light-foreground: #000000;
  --light-muted: #606060;
  --light-border: #c0c0c0;
  --light-selection: #e0e0e0;
  --light-cursor: #010101;
  --light-accent: #010101;
  --light-error: #010101;
  --light-star: #010101;
  --light-status-bar: #f0f0f0;
  --light-html-mail: #ffffff;
  --dark-background: #000000;
  --dark-foreground: #ffffff;
  --dark-muted: #808080;
  --dark-border: #404040;
  --dark-selection: #202020;
  --dark-cursor: #fefefe;
  --dark-accent: #fefefe;
  --dark-error: #fefefe;
  --dark-star: #fefefe;
  --dark-status-bar: #101010;
  --dark-html-mail: #ffffff;
  --color-surface-base: light-dark(#ffffff, #000000);
  --color-text-primary: light-dark(#000000, #ffffff);
  --color-text-secondary: light-dark(#606060, #808080);
  --color-border-default: light-dark(#c0c0c0, #404040);
  --color-selection: light-dark(#e0e0e0, #202020);
  --color-focus: light-dark(#010101, #fefefe);
  --color-surface-raised: light-dark(#f0f0f0, #101010);
  --color-surface-document: light-dark(#ffffff, #ffffff);
}
`;

describe("design system theme", () => {
  test("maps the glossary to the theme properties", () => {
    expect(new DesignSystemTheme(glossary).css()).toBe(EXPECTED_CSS);
  });

  test("a missing token names the token", () => {
    expect(() => new DesignSystemTheme([]).css()).toThrow("font.family.mono");
  });

  test("a font token that differs per mode is rejected", () => {
    const perMode = glossary.map((entry) =>
      entry.id === "font.size.body" ? { ...entry, values: { light: "13px", dark: "14px" } } : entry,
    );
    expect(() => new DesignSystemTheme(perMode).css()).toThrow("font.size.body");
  });
});
