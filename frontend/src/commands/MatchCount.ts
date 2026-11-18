export class MatchCount {
  constructor(
    private readonly position: number,
    private readonly total: number,
  ) {}

  static of(matchStarts: readonly number[], cursor: number): MatchCount {
    const ahead = matchStarts.findIndex((start) => start >= cursor);
    const position = matchStarts.length === 0 ? 0 : (ahead === -1 ? 0 : ahead) + 1;
    return new MatchCount(position, matchStarts.length);
  }

  static before(matchStarts: readonly number[], cursor: number): MatchCount {
    if (matchStarts.length === 0) return new MatchCount(0, 0);
    const behind = matchStarts.reduce((found, start, index) => (start < cursor ? index : found), -1);
    return new MatchCount((behind === -1 ? matchStarts.length - 1 : behind) + 1, matchStarts.length);
  }

  text(): string {
    return `${this.position}/${this.total}`;
  }
}
