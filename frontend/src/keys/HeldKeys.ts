export class HeldKeys {
  private held: string[] | null = [];

  constructor(private readonly deliver: (token: string) => void) {}

  press(token: string): void {
    if (this.held) this.held.push(token);
    else this.deliver(token);
  }

  releaseAfter(ready: Promise<unknown>): void {
    ready.then(
      () => this.release(),
      () => this.release(),
    );
  }

  release(): void {
    const held = this.held ?? [];
    this.held = null;
    for (const token of held) this.deliver(token);
  }
}
