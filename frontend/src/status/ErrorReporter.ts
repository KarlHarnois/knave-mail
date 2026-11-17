import { BridgeError } from "../bridge/BridgeError";
import type { Logger } from "../logging/Logger";
import type { StatusLine } from "./StatusLine";

const THROTTLED_NOTICE = "Gmail is rate limiting this account; try again in a minute";

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
    if (error instanceof BridgeError && error.kind === "throttled") this.reportThrottle(error);
    else this.reportFailure(error);
  }

  private reportThrottle(error: BridgeError): void {
    this.status.showNotice(THROTTLED_NOTICE);
    this.logger.info(error.describe());
  }

  private reportFailure(error: unknown): void {
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
