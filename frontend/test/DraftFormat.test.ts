import { describe, expect, test } from "bun:test";
import { AddressList } from "../src/AddressList";
import { DraftFormat } from "../src/DraftFormat";
import type { Draft } from "../src/Protocol";

const format = new DraftFormat();

const DRAFT: Draft = {
  to: ["Ada Lovelace <ada@example.com>", "grace@example.org"],
  cc: ["team@example.net"],
  subject: "Re: Engines",
  body: "Thanks!\n\n> earlier text\n> more",
  replyTo: "m-42",
};

describe("DraftFormat.format", () => {
  test("writes header lines, a blank line and the body", () => {
    expect(format.format(DRAFT)).toBe(
      [
        "To: Ada Lovelace <ada@example.com>, grace@example.org",
        "Cc: team@example.net",
        "Subject: Re: Engines",
        "",
        "Thanks!",
        "",
        "> earlier text",
        "> more",
      ].join("\n"),
    );
  });

  test("writes empty headers for a blank draft", () => {
    const blank: Draft = { to: [], cc: [], subject: "", body: "", replyTo: null };
    expect(format.format(blank)).toBe("To: \nCc: \nSubject: \n\n");
  });
});

describe("DraftFormat.parse", () => {
  test("reads comma separated recipients", () => {
    const draft = format.parse("To: a@example.com, b@example.com\nCc:\nSubject: Hi\n\nBody", null);
    expect(draft.to).toEqual(["a@example.com", "b@example.com"]);
    expect(draft.cc).toEqual([]);
  });

  test("reads the subject and the body after the first blank line", () => {
    const draft = format.parse("To: a@example.com\nCc: \nSubject: Hello there\n\nLine one\n\nLine three", null);
    expect(draft.subject).toBe("Hello there");
    expect(draft.body).toBe("Line one\n\nLine three");
  });

  test("header names are case insensitive and order free", () => {
    const draft = format.parse("subject: Late\nTO: x@example.com\n\n", null);
    expect(draft.subject).toBe("Late");
    expect(draft.to).toEqual(["x@example.com"]);
  });

  test("an indented line continues the previous header", () => {
    const draft = format.parse("To: a@example.com,\n  b@example.com\nSubject: s\n\nbody", null);
    expect(draft.to).toEqual(["a@example.com", "b@example.com"]);
  });

  test("missing headers default to empty values", () => {
    expect(format.parse("\nonly body", null)).toEqual({ to: [], cc: [], subject: "", body: "only body", replyTo: null });
  });

  test("a buffer without a blank line has no body", () => {
    expect(format.parse("To: a@example.com\nSubject: s", null).body).toBe("");
  });

  test("carries the replyTo id through", () => {
    expect(format.parse("To: a@example.com\n\n", "m-1").replyTo).toBe("m-1");
  });
});

describe("DraftFormat round trip", () => {
  test("parse undoes format", () => {
    expect(format.parse(format.format(DRAFT), DRAFT.replyTo)).toEqual(DRAFT);
  });

  test("parse undoes format for an empty body", () => {
    const draft: Draft = { ...DRAFT, body: "" };
    expect(format.parse(format.format(draft), draft.replyTo)).toEqual(draft);
  });

  test("format undoes parse for a normalised buffer", () => {
    const buffer = "To: a@example.com, b@example.com\nCc: \nSubject: S\n\nBody\n";
    expect(format.format(format.parse(buffer, null))).toBe(buffer);
  });
});

describe("AddressList", () => {
  const addresses = new AddressList();

  test("keeps commas inside quoted display names", () => {
    expect(addresses.split('"Doe, Jane" <jane@example.com>, bob@example.com')).toEqual([
      '"Doe, Jane" <jane@example.com>',
      "bob@example.com",
    ]);
  });

  test("drops empty entries and whitespace", () => {
    expect(addresses.split(" a@example.com ,, ,b@example.com, ")).toEqual(["a@example.com", "b@example.com"]);
  });

  test("joins with a comma and a space", () => {
    expect(addresses.join(["a@example.com", "b@example.com"])).toBe("a@example.com, b@example.com");
  });
});
