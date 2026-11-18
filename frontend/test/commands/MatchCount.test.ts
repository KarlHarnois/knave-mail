import { describe, expect, test } from "bun:test";
import { MatchCount } from "../../src/commands/MatchCount";

describe("match count", () => {
  test("counts the first match at or after the cursor", () => {
    expect(MatchCount.of([2, 10, 20], 5).text()).toBe("2/3");
  });

  test("wraps to the first match past the last one", () => {
    expect(MatchCount.of([2, 10], 30).text()).toBe("1/2");
  });

  test("shows no match as 0/0", () => {
    expect(MatchCount.of([], 0).text()).toBe("0/0");
  });
});
