import type { CoreError, CoreEvent, Request, Thread } from "../../src/bridge/Protocol";
import type { Transport } from "../../src/bridge/Transport";
import { MailFixtures } from "./MailFixtures";

type Handler = (args: Record<string, unknown>) => unknown;

const EMPTY_OK = {};

export class FakeCore implements Transport {
  readonly requests: Request[] = [];
  readonly logged: Array<{ level: string; message: string }> = [];
  thread: Thread = MailFixtures.thread();
  private receive: (message: unknown) => void = () => {};
  private readonly handlers = new Map<string, Handler>();
  private readonly failures = new Map<string, CoreError>();
  private readonly heldCommands = new Set<string>();
  private readonly heldRequests: Request[] = [];

  constructor() {
    this.handlers.set("accounts", () => [{ email: MailFixtures.ADA }, { email: MailFixtures.GRACE }]);
    this.handlers.set("labels", () => MailFixtures.labels());
    this.handlers.set("threads", () => MailFixtures.summaries(50));
    this.handlers.set("thread", () => this.thread);
    this.handlers.set("reply-draft", () => MailFixtures.replyDraft());
    this.handlers.set("forward-draft", () => ({
      ...MailFixtures.replyDraft(),
      to: [],
      subject: "Fwd: Subject 0",
      replyTo: null,
    }));
  }

  send(json: string): void {
    const request = JSON.parse(json) as Request;
    if (request.command === "log") {
      this.logged.push(request.args as { level: string; message: string });
      return;
    }
    this.requests.push(request);
    if (this.heldCommands.has(request.command)) this.heldRequests.push(request);
    else setTimeout(() => this.answer(request), 0);
  }

  onReceive(handler: (message: unknown) => void): void {
    this.receive = handler;
  }

  answerWith(command: string, handler: Handler): void {
    this.handlers.set(command, handler);
  }

  holdReplies(command: string): void {
    this.heldCommands.add(command);
  }

  releaseReplies(): void {
    this.heldCommands.clear();
    for (const request of this.heldRequests.splice(0)) this.answer(request);
  }

  failNext(command: string, error: CoreError): void {
    this.failures.set(command, error);
  }

  emit(event: CoreEvent): void {
    this.receive(event);
  }

  requestsFor(command: string): Request[] {
    return this.requests.filter((request) => request.command === command);
  }

  lastArgsFor(command: string): Record<string, unknown> {
    const request = this.requestsFor(command).at(-1);
    if (!request) throw new Error(`no ${command} request was sent`);
    return request.args;
  }

  private answer(request: Request): void {
    const failure = this.failures.get(request.command);
    this.failures.delete(request.command);
    if (failure) {
      this.receive({ id: request.id, error: failure });
      return;
    }
    const handler = this.handlers.get(request.command);
    this.receive({ id: request.id, ok: handler ? handler(request.args) : EMPTY_OK });
  }
}
