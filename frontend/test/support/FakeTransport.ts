import type { CoreError, CoreEvent, Request } from "../../src/Protocol";
import type { Transport } from "../../src/Transport";

export class FakeTransport implements Transport {
  readonly sent: Request[] = [];
  private receive: (message: unknown) => void = () => {};

  send(json: string): void {
    this.sent.push(JSON.parse(json) as Request);
  }

  onReceive(handler: (message: unknown) => void): void {
    this.receive = handler;
  }

  reply(id: number, ok: unknown): void {
    this.receive({ id, ok });
  }

  fail(id: number, error: CoreError): void {
    this.receive({ id, error });
  }

  emit(event: CoreEvent): void {
    this.receive(event);
  }

  deliver(message: unknown): void {
    this.receive(message);
  }

  lastRequest(): Request {
    const request = this.sent.at(-1);
    if (!request) throw new Error("no request was sent");
    return request;
  }
}
