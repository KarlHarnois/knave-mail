const FALLBACK_DELAY_MS = 50;

export class FrameClock {
  constructor(private readonly window: Window) {}

  request(callback: () => void): void {
    let ran = false;
    const runOnce = () => {
      if (ran) return;
      ran = true;
      callback();
    };
    this.window.requestAnimationFrame(runOnce);
    this.window.setTimeout(runOnce, FALLBACK_DELAY_MS);
  }
}
