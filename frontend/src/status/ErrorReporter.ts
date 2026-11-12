import { BridgeError } from "../bridge/BridgeError";
import type { StatusLine } from "./StatusLine";

export class ErrorReporter {
  constructor(private readonly status: StatusLine) {}

  run(task: Promise<unknown>, recover?: () => void): void {
    task.catch((error: unknown) => {
      this.report(error);
      recover?.();
    });
  }

  report(error: unknown): void {
    this.status.showError(this.describe(error));
  }

  private describe(error: unknown): string {
    if (error instanceof BridgeError) return error.describe();
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
