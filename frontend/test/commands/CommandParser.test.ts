import { describe, expect, test } from "bun:test";
import { CommandParser } from "../../src/commands/CommandParser";

const parser = new CommandParser();

describe("CommandParser", () => {
  test("parses :account with an email", () => {
    expect(parser.parse("account ada@example.com")).toEqual({ kind: "account", email: "ada@example.com" });
  });

  test("accepts a leading colon and extra spaces", () => {
    expect(parser.parse("  :account   ada@example.com  ")).toEqual({ kind: "account", email: "ada@example.com" });
  });

  test("keeps spaces inside a label name", () => {
    expect(parser.parse("label Project Updates")).toEqual({ kind: "label", name: "Project Updates" });
  });

  test("parses :sync", () => {
    expect(parser.parse("sync")).toEqual({ kind: "sync" });
  });

  test("parses :q and :quit", () => {
    expect(parser.parse("q")).toEqual({ kind: "quit" });
    expect(parser.parse("quit")).toEqual({ kind: "quit" });
  });

  test("an empty line is a no-op", () => {
    expect(parser.parse("   ")).toEqual({ kind: "empty" });
  });

  test("reports missing arguments with usage", () => {
    expect(parser.parse("account")).toEqual({ kind: "problem", message: "usage: :account <email>" });
    expect(parser.parse("label")).toEqual({ kind: "problem", message: "usage: :label <name>" });
  });

  test("rejects arguments on commands that take none", () => {
    expect(parser.parse("sync now")).toEqual({ kind: "problem", message: ":sync takes no argument" });
  });

  test("reports unknown commands", () => {
    expect(parser.parse("frobnicate")).toEqual({ kind: "problem", message: "not a command: frobnicate" });
  });
});
