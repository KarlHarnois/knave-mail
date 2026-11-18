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
    await this.prependDesignSystem("app.css");
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

  private async prependDesignSystem(stylesheetName: string): Promise<void> {
    const stylesheet = Bun.file(join(this.outputDirectory, stylesheetName));
    const designSystem = new DesignSystemPackage();
    const defaultTheme = new DesignSystemTheme(await designSystem.glossary()).css();
    await Bun.write(stylesheet, (await designSystem.stylesheets()) + defaultTheme + (await stylesheet.text()));
  }
}

class DesignSystemPackage {
  private readonly directory = this.packageDirectory();

  glossary(): Promise<GlossaryEntry[]> {
    return Bun.file(join(this.directory, "glossary", "glossary.json")).json();
  }

  async stylesheets(): Promise<string> {
    const paths = [join(this.directory, "css", "tokens.css"), ...(await this.componentPaths())];
    const texts = await Promise.all(paths.map((path) => Bun.file(path).text()));
    return texts.join("\n");
  }

  private async componentPaths(): Promise<string[]> {
    const components = join(this.directory, "css", "components");
    const index = await Bun.file(join(components, "index.css")).text();
    return [...index.matchAll(/@import "([^"]+)";/g)].map(([, file = ""]) => join(components, file));
  }

  private packageDirectory(): string {
    const directory = Bun.env["DESIGN_SYSTEM"];
    if (directory === undefined) {
      throw new Error("DESIGN_SYSTEM is not set; build from the Nix dev shell, which points it at the design system");
    }
    return directory;
  }
}

await new FrontendBuild().run();
