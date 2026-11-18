import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { DesignSystemTheme, type GlossaryEntry } from "./tools/DesignSystemTheme";

class FrontendBuild {
  private readonly sourceDirectory = join(import.meta.dir, "src");
  private readonly outputDirectory = join(import.meta.dir, "dist");

  async run(): Promise<void> {
    await rm(this.outputDirectory, { recursive: true, force: true });
    await mkdir(this.outputDirectory, { recursive: true });
    await this.bundle("main.ts", "app.js", "iife");
    await this.bundle("darkmail/darkReaderEntry.ts", "darkreader.js", "iife");
    await this.bundle("app.css", "app.css", "esm");
    await this.prependDefaultTheme("app.css");
    await copyFile(join(this.sourceDirectory, "index.html"), join(this.outputDirectory, "index.html"));
  }

  private async bundle(entry: string, outputName: string, format: "iife" | "esm"): Promise<void> {
    const result = await Bun.build({
      entrypoints: [join(this.sourceDirectory, entry)],
      outdir: this.outputDirectory,
      naming: outputName,
      format,
      minify: true,
      target: "browser",
    });
    if (!result.success) throw new AggregateError(result.logs, `bundling ${entry} failed`);
  }

  private async prependDefaultTheme(stylesheetName: string): Promise<void> {
    const stylesheet = Bun.file(join(this.outputDirectory, stylesheetName));
    const defaultTheme = new DesignSystemTheme(await new DesignSystemGlossary().entries()).css();
    await Bun.write(stylesheet, defaultTheme + (await stylesheet.text()));
  }
}

class DesignSystemGlossary {
  private readonly packageDirectory = Bun.env["DESIGN_SYSTEM"];

  async entries(): Promise<GlossaryEntry[]> {
    if (this.packageDirectory === undefined) {
      throw new Error("DESIGN_SYSTEM is not set; build from the Nix dev shell, which points it at the design system");
    }
    return Bun.file(join(this.packageDirectory, "glossary", "glossary.json")).json();
  }
}

await new FrontendBuild().run();
