import { describe, expect, test } from "bun:test";
import { Bridge } from "../../src/bridge/Bridge";
import { BridgeError } from "../../src/bridge/BridgeError";
import { MailClient, type ThreadQuery } from "../../src/bridge/MailClient";
import type { CoreEvent } from "../../src/bridge/Protocol";
import { Logger } from "../../src/logging/Logger";
import { IpcFixtures } from "../support/IpcFixtures";
import { type FieldType, JsonShape, ListOf } from "../support/JsonShape";
import { ProtocolShapes } from "../support/ProtocolShapes";
import { RecordedCore } from "../support/RecordedCore";

const ACCOUNT = "ada@example.com";
const INBOX_QUERY: ThreadQuery = { account: ACCOUNT, label: "INBOX", query: "", limit: 10 };
const fixtures = new IpcFixtures();
const shapes = new JsonShape();

class Exchange {
  readonly core: RecordedCore;
  readonly client: MailClient;

  constructor(private readonly name: string) {
    this.core = new RecordedCore(fixtures.read(`${name}.reply`));
    this.client = new MailClient(new Bridge(this.core));
  }

  expectRecordedRequest(): void {
    expect(this.core.sent).toEqual([fixtures.read(`${this.name}.request`)]);
  }

  expectShape(answer: unknown, type: FieldType): void {
    expect(shapes.problemsIn(answer, type, this.name)).toEqual([]);
  }
}

describe("requests and replies match the core's recordings", () => {
  test("accounts", async () => {
    const exchange = new Exchange("accounts");
    exchange.expectShape(await exchange.client.accounts(), new ListOf(ProtocolShapes.account));
    exchange.expectRecordedRequest();
  });

  test("labels", async () => {
    const exchange = new Exchange("labels");
    exchange.expectShape(await exchange.client.labels(ACCOUNT), new ListOf(ProtocolShapes.label));
    exchange.expectRecordedRequest();
  });

  test("threads", async () => {
    const exchange = new Exchange("threads");
    exchange.expectShape(await exchange.client.threads(INBOX_QUERY), new ListOf(ProtocolShapes.threadSummary));
    exchange.expectRecordedRequest();
  });

  test("thread-page", async () => {
    const exchange = new Exchange("thread-page");
    exchange.expectShape(await exchange.client.threadPage(INBOX_QUERY, ""), ProtocolShapes.threadPage);
    exchange.expectRecordedRequest();
  });

  test("thread", async () => {
    const exchange = new Exchange("thread");
    exchange.expectShape(await exchange.client.thread(ACCOUNT, "t-1"), ProtocolShapes.thread);
    exchange.expectRecordedRequest();
  });

  test("reply-draft", async () => {
    const exchange = new Exchange("reply-draft");
    exchange.expectShape(await exchange.client.replyDraft(ACCOUNT, "m-t-1", true), ProtocolShapes.draft);
    exchange.expectRecordedRequest();
  });

  test("forward-draft", async () => {
    const exchange = new Exchange("forward-draft");
    exchange.expectShape(await exchange.client.forwardDraft(ACCOUNT, "m-t-1"), ProtocolShapes.draft);
    exchange.expectRecordedRequest();
  });

  test("send", async () => {
    const exchange = new Exchange("send");
    const draft = { to: ["grace@example.com"], cc: [], subject: "Hi", body: "Hello", replyTo: null };
    await exchange.client.send(ACCOUNT, draft);
    exchange.expectRecordedRequest();
  });

  test("archive", async () => {
    const exchange = new Exchange("archive");
    await exchange.client.modify("archive", ACCOUNT, ["t-1"]);
    exchange.expectRecordedRequest();
  });

  test("archive-older", async () => {
    const exchange = new Exchange("archive-older");
    exchange.expectShape(await exchange.client.archiveOlder(ACCOUNT, "2026/10/01"), ProtocolShapes.archivedOlder);
    exchange.expectRecordedRequest();
  });

  test("a missing thread", async () => {
    const exchange = new Exchange("thread-missing");
    const failure = await exchange.client.thread(ACCOUNT, "t-9").catch((error: unknown) => error);
    if (!(failure instanceof BridgeError)) throw new Error("the core's refusal did not reach the caller");
    exchange.expectShape({ kind: failure.kind, message: failure.message }, ProtocolShapes.coreError);
    exchange.expectRecordedRequest();
  });

  test("a frontend log entry", () => {
    const core = new RecordedCore(undefined);
    new Logger(core).warn("thread-page: throttled: Gmail is rate limiting this account");
    expect(core.sent).toEqual([fixtures.read("log.request")]);
  });
});

describe("events match the core's recordings", () => {
  const names: CoreEvent["event"][] = ["synced", "sync-progress", "sync-failed", "queue", "operation-failed"];

  for (const name of names) {
    test(name, () => {
      const core = new RecordedCore(undefined);
      const received: CoreEvent[] = [];
      new Bridge(core).subscribe((event) => received.push(event));
      core.emit(fixtures.read(`${name}.event`));
      expect(received.map((event) => event.event)).toEqual([name]);
      expect(shapes.problemsIn(received[0], ProtocolShapes.events[name], name)).toEqual([]);
    });
  }
});
