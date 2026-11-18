import { describe, expect, test } from "bun:test";
import { EditorSearchCount } from "../../src/vim/EditorSearchCount";

const TEXT = "reply one\nfoo-bar and foo bar\nreply two\nreply three";

describe("editor search count", () => {
  test("reads the query as a pattern, as the search does", () => {
    expect(new EditorSearchCount(TEXT, 0).count("foo.bar", "forward")).toBe("1/2");
  });

  test("counts / forward from the cursor", () => {
    expect(new EditorSearchCount(TEXT, TEXT.indexOf("two")).count("reply", "forward")).toBe("3/3");
  });

  test("counts ? backward from the cursor", () => {
    expect(new EditorSearchCount(TEXT, TEXT.indexOf("two")).count("reply", "backward")).toBe("2/3");
  });

  test("a query that is not a valid pattern is matched as text", () => {
    expect(new EditorSearchCount("a (b) c", 0).count("(b", "forward")).toBe("1/1");
  });
});
