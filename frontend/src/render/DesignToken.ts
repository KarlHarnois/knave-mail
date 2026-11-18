const PIXELS = /^(\d+(?:\.\d+)?)px$/;

export class DesignToken {
  constructor(private readonly window: Window) {}

  pixels(property: string): number {
    const value = this.resolvedLength(property);
    const pixels = Number(PIXELS.exec(value)?.[1] ?? 0);
    if (pixels <= 0) throw new Error(`${property} is \`${value}\`, but a positive length in pixels is needed`);
    return pixels;
  }

  private resolvedLength(property: string): string {
    const probe = this.window.document.createElement("div");
    probe.style.height = `var(${property})`;
    this.window.document.body.append(probe);
    const height = this.window.getComputedStyle(probe).height;
    probe.remove();
    return height;
  }
}
