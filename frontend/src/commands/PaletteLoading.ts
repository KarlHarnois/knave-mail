import type { PaletteEntry } from "./PaletteRequest";

type Loaded = (entries: readonly PaletteEntry[], keysTyped: readonly string[]) => void;
type Failed = (error: unknown) => void;

export class PaletteLoading {
  private keysTyped: string[] | null = null;

  wait(entries: Promise<readonly PaletteEntry[]>, loaded: Loaded, failed: Failed): void {
    this.keysTyped = [];
    entries.then(
      (loadedEntries) => loaded(loadedEntries, this.release()),
      (error: unknown) => failed(error),
    );
  }

  holds(token: string): boolean {
    this.keysTyped?.push(token);
    return this.keysTyped !== null;
  }

  cancel(): void {
    this.keysTyped = null;
  }

  private release(): readonly string[] {
    const keysTyped = this.keysTyped ?? [];
    this.keysTyped = null;
    return keysTyped;
  }
}
