import { describe, expect, test } from "bun:test";
import { DesignSystemTheme } from "../../tools/DesignSystemTheme";
import glossary from "./fixtures/glossary.json";

const theme = new DesignSystemTheme(glossary).render();
const darkSection = theme.slice(theme.indexOf("(dark"));

describe("design system theme", () => {
  test("the interface font is the first mono family", () => {
    expect(theme).toContain(':font "Fixture Mono"');
  });

  test("the message font is the first prose family", () => {
    expect(theme).toContain(':message-font "Fixture Sans"');
  });

  test("the font size is the body size in pixels", () => {
    expect(theme).toContain(":font-size 10");
  });

  test("each mode takes its own background", () => {
    expect(theme).toContain('(light :background "#ffffff"');
    expect(darkSection).toStartWith('(dark :background "#000000"');
  });

  test("muted text is the secondary text color", () => {
    expect(darkSection).toContain(':muted "#808080"');
  });

  test("accents, errors and stars all take the focus color", () => {
    expect(darkSection).toContain(':accent "#fefefe"');
    expect(darkSection).toContain(':error "#fefefe"');
    expect(darkSection).toContain(':star "#fefefe"');
  });

  test("HTML mail keeps the document canvas in the dark mode", () => {
    expect(darkSection).toContain(':html-mail "#ffffff"');
  });

  test("a missing token names the token", () => {
    expect(() => new DesignSystemTheme([]).render()).toThrow("font.family.mono");
  });
});
