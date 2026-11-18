import { describe, expect, test } from "bun:test";
import { DesignSystemTheme } from "../../tools/DesignSystemTheme";
import glossary from "./fixtures/glossary.json";

const css = new DesignSystemTheme(glossary).css();

describe("design system theme", () => {
  test("the interface font is the mono family", () => {
    expect(css).toContain('--default-font: "Fixture Mono", "Fixture Term", monospace;');
  });

  test("the message font is the prose family", () => {
    expect(css).toContain('--default-message-font: "Fixture Sans", sans-serif;');
  });

  test("the font size is the body size", () => {
    expect(css).toContain("--font-size: 10px;");
  });

  test("each mode takes its own background", () => {
    expect(css).toContain("--light-background: #ffffff;");
    expect(css).toContain("--dark-background: #000000;");
  });

  test("muted text is the secondary text color", () => {
    expect(css).toContain("--dark-muted: #808080;");
  });

  test("accents, errors and stars all take the focus color", () => {
    expect(css).toContain("--dark-accent: #fefefe;");
    expect(css).toContain("--dark-error: #fefefe;");
    expect(css).toContain("--dark-star: #fefefe;");
  });

  test("HTML mail keeps the document canvas in the dark mode", () => {
    expect(css).toContain("--dark-html-mail: #ffffff;");
  });

  test("a missing token names the token", () => {
    expect(() => new DesignSystemTheme([]).css()).toThrow("font.family.mono");
  });
});
