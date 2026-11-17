export class ListTrace {
  private pendingEvent: string | null = null;

  constructor(private readonly write: (message: string) => void) {}

  mark(event: string): void {
    this.pendingEvent = event;
  }

  afterPaint(state: () => string): void {
    if (this.pendingEvent) this.write(`list ${this.pendingEvent}: ${state()}`);
    this.pendingEvent = null;
  }
}
