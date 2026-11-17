import type { Transport } from "../../src/bridge/Transport";

export class RecordedCore implements Transport {
  readonly sent: unknown[] = [];
  private receive: (message: unknown) => void = () => {};

  constructor(private readonly recordedReply: unknown) {}

  send(json: string): void {
    this.sent.push(JSON.parse(json));
    this.receive(this.recordedReply);
  }

  onReceive(handler: (message: unknown) => void): void {
    this.receive = handler;
  }

  emit(event: unknown): void {
    this.receive(event);
  }
}
