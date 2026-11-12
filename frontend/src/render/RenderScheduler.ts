export type FrameRequester = (callback: () => void) => void;

export class RenderScheduler {
  private readonly tasks = new Set<() => void>();
  private frameRequested = false;
  private settledWaiters: Array<() => void> = [];

  constructor(private readonly requestFrame: FrameRequester) {}

  get isPending(): boolean {
    return this.tasks.size > 0;
  }

  schedule(task: () => void): void {
    this.tasks.add(task);
    if (this.frameRequested) return;
    this.frameRequested = true;
    this.requestFrame(() => this.flush());
  }

  flush(): void {
    this.frameRequested = false;
    const tasks = [...this.tasks];
    this.tasks.clear();
    for (const task of tasks) task();
    if (this.tasks.size === 0) this.wakeSettledWaiters();
  }

  whenSettled(): Promise<void> {
    if (!this.isPending) return Promise.resolve();
    return new Promise((resolve) => this.settledWaiters.push(resolve));
  }

  private wakeSettledWaiters(): void {
    const waiters = this.settledWaiters;
    this.settledWaiters = [];
    for (const wake of waiters) wake();
  }
}
