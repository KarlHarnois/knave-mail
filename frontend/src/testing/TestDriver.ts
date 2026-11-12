import type { Bridge } from "../bridge/Bridge";
import { KeyNotation } from "../keys/KeyNotation";
import type { RenderScheduler } from "../render/RenderScheduler";

const QUIET_CHECKS_FOR_IDLE = 2;

export type TestDriverApi = {
  press(keys: string): void;
  text(selector: string): string;
  count(selector: string): number;
  whenIdle(): Promise<void>;
};

type DriverWindow = Window & { knaveTestDriver?: TestDriverApi };

export type TestDriverPorts = {
  document: Document;
  pressToken: (token: string) => void;
  bridge: Bridge;
  scheduler: RenderScheduler;
  startup: Promise<unknown>;
};

export class TestDriver implements TestDriverApi {
  private readonly notation = new KeyNotation();

  constructor(private readonly ports: TestDriverPorts) {}

  press(keys: string): void {
    for (const token of this.notation.tokenize(keys)) this.ports.pressToken(token);
  }

  text(selector: string): string {
    return this.ports.document.querySelector(selector)?.textContent ?? "";
  }

  count(selector: string): number {
    return this.ports.document.querySelectorAll(selector).length;
  }

  async whenIdle(): Promise<void> {
    await this.ports.startup.catch(() => undefined);
    let quietChecks = 0;
    while (quietChecks < QUIET_CHECKS_FOR_IDLE) {
      await this.ports.bridge.whenIdle();
      await this.ports.scheduler.whenSettled();
      await this.nextTask();
      quietChecks = this.isBusy() ? 0 : quietChecks + 1;
    }
  }

  installOn(window: Window): void {
    (window as DriverWindow).knaveTestDriver = this.api();
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
    return this.ports.bridge.pendingCount > 0 || this.ports.scheduler.isPending;
  }

  private nextTask(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
}
