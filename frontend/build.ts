import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

class FrontendBuild {
  private readonly sourceDirectory = join(import.meta.dir, "src");
  private readonly outputDirectory = join(import.meta.dir, "dist");

  async run(): Promise<void> {
    await rm(this.outputDirectory, { recursive: true, force: true });
    await mkdir(this.outputDirectory, { recursive: true });
    await this.bundle("main.ts", "app.js", "iife");
    await this.bundle("app.css", "app.css", "esm");
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
}

await new FrontendBuild().run();
