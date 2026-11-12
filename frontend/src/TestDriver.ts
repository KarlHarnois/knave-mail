import type { Bridge } from "./Bridge";
import { KeyNotation } from "./KeyNotation";
import type { RenderScheduler } from "./RenderScheduler";

const QUIET_CHECKS_FOR_IDLE = 2;

export type TestDriverApi = {
  press(keys: string): void;
  text(selector: string): string;
  count(selector: string): number;
  whenIdle(): Promise<void>;
};

export class TestDriver implements TestDriverApi {
  constructor(
    private readonly document: Document,
    private readonly pressToken: (token: string) => void,
    private readonly bridge: Bridge,
    private readonly scheduler: RenderScheduler,
    private readonly notation = new KeyNotation(),
  ) {}

  press(keys: string): void {
    for (const token of this.notation.tokenize(keys)) this.pressToken(token);
  }

  text(selector: string): string {
    return this.document.querySelector(selector)?.textContent ?? "";
  }

  count(selector: string): number {
    return this.document.querySelectorAll(selector).length;
  }

  async whenIdle(): Promise<void> {
    let quietChecks = 0;
    while (quietChecks < QUIET_CHECKS_FOR_IDLE) {
      await this.bridge.whenIdle();
      await this.scheduler.whenSettled();
      await this.nextTask();
      quietChecks = this.isBusy() ? 0 : quietChecks + 1;
    }
  }

  api(): TestDriverApi {
    return {
      press: (keys) => this.press(keys),
      text: (selector) => this.text(selector),
      count: (selector) => this.count(selector),
      whenIdle: () => this.whenIdle(),
    };
  }

  private isBusy(): boolean {
    return this.bridge.pendingCount > 0 || this.scheduler.isPending;
  }

  private nextTask(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
}
