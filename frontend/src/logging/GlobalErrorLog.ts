import type { Logger } from "./Logger";

export class GlobalErrorLog {
  constructor(
    private readonly window: Window,
    private readonly logger: Logger,
  ) {}

  watch(): void {
    this.window.addEventListener("error", (event) => this.logger.error(this.describeError(event)));
    this.window.addEventListener("unhandledrejection", (event) =>
      this.logger.error(`unhandled rejection: ${this.describeReason(event.reason)}`),
    );
  }

  private describeError(event: ErrorEvent): string {
    const where = event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : "";
    return `uncaught error: ${event.message}${where}`;
  }

  private describeReason(reason: unknown): string {
    if (reason instanceof Error) return `${reason.message}\n${reason.stack ?? ""}`;
    return String(reason);
  }
}
