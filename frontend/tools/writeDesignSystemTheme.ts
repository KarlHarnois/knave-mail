import { DesignSystemTheme } from "./DesignSystemTheme";

const [glossaryPath] = Bun.argv.slice(2);
if (glossaryPath === undefined) throw new Error("Usage: bun run tools/writeDesignSystemTheme.ts <glossary.json>");

const glossary = await Bun.file(glossaryPath).json();
process.stdout.write(new DesignSystemTheme(glossary).render());
