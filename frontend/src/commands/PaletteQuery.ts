import type { PaletteEntry } from "./CommandPalette";

const ARGUMENT_SEPARATOR = " ";

export class PaletteQuery {
  constructor(
    private readonly text: string,
    private readonly takesArguments: boolean,
  ) {}

  get name(): string {
    const text = this.text.toLowerCase();
    return this.takesArguments ? (text.split(ARGUMENT_SEPARATOR)[0] ?? "") : text;
  }

  get hasArgument(): boolean {
    return this.takesArguments && this.text.includes(ARGUMENT_SEPARATOR);
  }

  matches(entry: PaletteEntry): boolean {
    const name = entry.name.toLowerCase();
    return this.hasArgument ? name === this.name : name.includes(this.name);
  }

  names(entry: PaletteEntry): boolean {
    return entry.name.toLowerCase() === this.name;
  }

  static withArgumentOf(entry: PaletteEntry): string {
    return entry.name + ARGUMENT_SEPARATOR;
  }
}
