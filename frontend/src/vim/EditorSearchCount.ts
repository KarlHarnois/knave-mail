import { MatchCount } from "../commands/MatchCount";

export type SearchDirection = "forward" | "backward";

const REGEX_SYNTAX = /[.*+?^${}()|[\]\\]/g;

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
    return this.isValidPattern(query) ? new RegExp(query, "g") : new RegExp(query.replace(REGEX_SYNTAX, "\\$&"), "g");
  }

  private isValidPattern(query: string): boolean {
    try {
      new RegExp(query);
      return true;
    } catch {
      return false;
    }
  }
}
