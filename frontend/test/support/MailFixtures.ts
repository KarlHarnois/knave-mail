import type { Draft, Label, Message, Thread, ThreadSummary } from "../../src/Protocol";

const BASE_DATE = Date.UTC(2026, 10, 1, 9, 30);
const MINUTE = 60_000;

export class MailFixtures {
  static readonly ADA = "ada@example.com";
  static readonly GRACE = "grace@example.org";

  static summary(index: number, changes: Partial<ThreadSummary> = {}): ThreadSummary {
    return {
      id: `t-${index}`,
      subject: `Subject ${index}`,
      participants: `Sender ${index}`,
      snippet: `Snippet for thread ${index}`,
      date: BASE_DATE - index * MINUTE,
      unread: index % 3 === 0,
      starred: false,
      labels: ["INBOX"],
      messageCount: 1 + (index % 4),
      ...changes,
    };
  }

  static summaries(count: number): ThreadSummary[] {
    return Array.from({ length: count }, (_, index) => MailFixtures.summary(index));
  }

  static message(index: number, changes: Partial<Message> = {}): Message {
    return {
      id: `m-${index}`,
      threadId: "t-0",
      from: `Sender ${index} <sender${index}@example.net>`,
      to: [MailFixtures.ADA],
      cc: [],
      subject: "Subject 0",
      date: BASE_DATE + index * MINUTE,
      text: `Plain body of message ${index}\nsecond line ${index}`,
      html: null,
      ...changes,
    };
  }

  static thread(messageCount = 3): Thread {
    const messages = Array.from({ length: messageCount }, (_, index) => MailFixtures.message(index));
    return { id: "t-0", subject: "Subject 0", labels: ["INBOX"], messages };
  }

  static labels(): Label[] {
    return [
      { id: "INBOX", name: "INBOX", unread: 2 },
      { id: "Label_7", name: "Receipts", unread: 0 },
    ];
  }

  static replyDraft(): Draft {
    return {
      to: ["Sender 2 <sender2@example.net>"],
      cc: [],
      subject: "Re: Subject 0",
      body: "\n> Plain body of message 2",
      replyTo: "m-2",
    };
  }
}
