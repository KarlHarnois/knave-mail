import type { CoreError, CoreEvent, Request, Thread } from "../../src/Protocol";
import type { Transport } from "../../src/Transport";
import { MailFixtures } from "./MailFixtures";

type Handler = (args: Record<string, unknown>) => unknown;

const EMPTY_OK = {};

export class FakeCore implements Transport {
  readonly requests: Request[] = [];
  thread: Thread = MailFixtures.thread();
  private receive: (message: unknown) => void = () => {};
  private readonly handlers = new Map<string, Handler>();
  private readonly failures = new Map<string, CoreError>();

  constructor() {
    this.handlers.set("accounts", () => [{ email: MailFixtures.ADA }, { email: MailFixtures.GRACE }]);
    this.handlers.set("labels", () => MailFixtures.labels());
    this.handlers.set("threads", () => MailFixtures.summaries(50));
    this.handlers.set("thread", () => this.thread);
    this.handlers.set("reply-draft", () => MailFixtures.replyDraft());
    this.handlers.set("forward-draft", () => ({ ...MailFixtures.replyDraft(), to: [], subject: "Fwd: Subject 0", replyTo: null }));
  }

  send(json: string): void {
    const request = JSON.parse(json) as Request;
    this.requests.push(request);
    setTimeout(() => this.answer(request), 0);
  }

  onReceive(handler: (message: unknown) => void): void {
    this.receive = handler;
  }

  answerWith(command: string, handler: Handler): void {
    this.handlers.set(command, handler);
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
    if (failure) return this.receive({ id: request.id, error: failure });
    const handler = this.handlers.get(request.command);
    this.receive({ id: request.id, ok: handler ? handler(request.args) : EMPTY_OK });
  }
}
