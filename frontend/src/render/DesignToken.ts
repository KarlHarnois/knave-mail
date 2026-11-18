const PIXELS = /^(\d+(?:\.\d+)?)px$/;

export class DesignToken {
  constructor(private readonly window: Window) {}

  pixels(property: string): number {
    const value = this.resolvedLength(property);
    const pixels = PIXELS.exec(value)?.[1];
    if (pixels === undefined) throw new Error(`${property} is \`${value}\`, but a length in pixels is needed`);
    return Number(pixels);
  }

  private resolvedLength(property: string): string {
    const probe = this.window.document.createElement("div");
    probe.style.width = `var(${property})`;
    this.window.document.body.append(probe);
    const width = this.window.getComputedStyle(probe).width;
    probe.remove();
    return width;
  }
}
