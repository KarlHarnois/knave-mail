import { MatchCount } from "../commands/MatchCount";

export type SearchDirection = "forward" | "backward";

const REGEX_SYNTAX = /[.*+?^${}()|[\]\\]/g;
const UPPERCASE = /[A-Z]/;
const ESCAPE = "\\";
const FLAGS_SEPARATOR = "/";

export class EditorSearchCount {
  constructor(
    private readonly text: string,
    private readonly cursor: number,
  ) {}

  count(query: string, direction: SearchDirection): string {
    const starts = [...this.text.matchAll(this.pattern(query))].map((match) => match.index ?? 0);
    const count =
      direction === "forward" ? MatchCount.of(starts, this.cursor + 1) : MatchCount.before(starts, this.cursor);
    return count.text();
  }

  private pattern(query: string): RegExp {
    const separator = this.flagsSeparator(query);
    const source = separator === -1 ? query : query.slice(0, separator);
    const forcesIgnoreCase = separator !== -1 && query.slice(separator).includes("i");
    const flags = forcesIgnoreCase || !UPPERCASE.test(source) ? "gim" : "gm";
    if (source === "") return /$^/g;
    return this.isValidPattern(source, flags)
      ? new RegExp(source, flags)
      : new RegExp(source.replace(REGEX_SYNTAX, "\\$&"), flags);
  }

  private flagsSeparator(query: string): number {
    for (let index = 0; index < query.length; index++) {
      if (query[index] === ESCAPE) index++;
      else if (query[index] === FLAGS_SEPARATOR) return index;
    }
    return -1;
  }

  private isValidPattern(source: string, flags: string): boolean {
    try {
      new RegExp(source, flags);
      return true;
    } catch {
      return false;
    }
  }
}
