import type { Draft } from "../bridge/Protocol";
import { AddressList } from "./AddressList";

type Headers = Map<string, string>;

const HEADER_LINE = /^([A-Za-z-]+):\s?(.*)$/;
const CONTINUATION_LINE = /^\s+\S/;
const HEADER_COUNT = 3;

export class DraftFormat {
  constructor(private readonly addresses: AddressList = new AddressList()) {}

  get separatorLine(): number {
    return HEADER_COUNT + 1;
  }

  get recipientLine(): number {
    return 1;
  }

  format(draft: Draft): string {
    return [
      `To: ${this.addresses.join(draft.to)}`,
      `Cc: ${this.addresses.join(draft.cc)}`,
      `Subject: ${draft.subject}`,
      "",
      draft.body,
    ].join("\n");
  }

  parse(buffer: string, replyTo: string | null): Draft {
    const lines = buffer.split("\n");
    const blankLine = lines.indexOf("");
    const headerEnd = blankLine < 0 ? lines.length : blankLine;
    const headers = this.parseHeaders(lines.slice(0, headerEnd));
    return {
      to: this.addresses.split(headers.get("to") ?? ""),
      cc: this.addresses.split(headers.get("cc") ?? ""),
      subject: headers.get("subject") ?? "",
      body: lines.slice(headerEnd + 1).join("\n"),
      replyTo,
    };
  }

  private parseHeaders(lines: string[]): Headers {
    const headers: Headers = new Map();
    let lastName = "";
    for (const line of lines) lastName = this.parseHeaderLine(headers, line, lastName);
    return headers;
  }

  private parseHeaderLine(headers: Headers, line: string, lastName: string): string {
    const header = HEADER_LINE.exec(line);
    if (header) {
      const name = (header[1] ?? "").toLowerCase();
      headers.set(name, (header[2] ?? "").trim());
      return name;
    }
    if (lastName && CONTINUATION_LINE.test(line)) this.continueHeader(headers, lastName, line);
    return lastName;
  }

  private continueHeader(headers: Headers, name: string, line: string): void {
    headers.set(name, `${headers.get(name) ?? ""} ${line.trim()}`);
  }
}
