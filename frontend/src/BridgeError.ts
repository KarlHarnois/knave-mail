import type { CoreError, ErrorKind } from "./Protocol";

export class BridgeError extends Error {
  readonly kind: ErrorKind;
  readonly command: string;

  constructor(command: string, error: CoreError) {
    super(error.message);
    this.name = "BridgeError";
    this.kind = error.kind;
    this.command = command;
  }

  describe(): string {
    return `${this.command}: ${this.kind}: ${this.message}`;
  }
}
