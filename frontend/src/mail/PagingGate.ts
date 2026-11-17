import { BridgeError } from "../bridge/BridgeError";

const PAUSE_AFTER_THROTTLE_MILLISECONDS = 60_000;

export class PagingGate {
  private loading = false;
  private resumeAt = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  async load(nextPage: () => Promise<void>): Promise<void> {
    if (this.loading || this.now() < this.resumeAt) return;
    this.loading = true;
    try {
      await nextPage();
    } catch (error) {
      this.pauseAfter(error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  private pauseAfter(error: unknown): void {
    if (error instanceof BridgeError && error.kind === "throttled") {
      this.resumeAt = this.now() + PAUSE_AFTER_THROTTLE_MILLISECONDS;
    }
  }
}
