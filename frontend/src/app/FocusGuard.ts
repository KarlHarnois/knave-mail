export class FocusGuard {
  constructor(
    private readonly window: Window,
    private readonly restoreFocus: () => void,
  ) {}

  watch(): void {
    this.window.addEventListener("blur", () => this.window.setTimeout(() => this.reclaimFromFrame(), 0));
    this.window.document.addEventListener("focusin", () => this.reclaimFromFrame());
  }

  private reclaimFromFrame(): void {
    if (this.window.document.activeElement?.tagName === "IFRAME") this.restoreFocus();
  }
}
