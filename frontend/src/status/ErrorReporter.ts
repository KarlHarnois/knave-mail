import { BridgeError } from "../bridge/BridgeError";
import type { Logger } from "../logging/Logger";
import type { StatusLine } from "./StatusLine";

export class ErrorReporter {
  constructor(
    private readonly status: StatusLine,
    private readonly logger: Logger,
  ) {}

  run(task: Promise<unknown>, recover?: () => void): void {
    task.catch((error: unknown) => {
      this.report(error);
      recover?.();
    });
  }

  report(error: unknown): void {
    const description = this.describe(error);
    this.status.showError(description);
    this.logger.warn(description);
  }

  private describe(error: unknown): string {
    if (error instanceof BridgeError) return error.describe();
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
