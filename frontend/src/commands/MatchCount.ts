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

  text(): string {
    return `${this.position}/${this.total}`;
  }
}
