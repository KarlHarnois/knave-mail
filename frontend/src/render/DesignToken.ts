const PIXELS = /^(\d+(?:\.\d+)?)px$/;

export class DesignToken {
  constructor(private readonly window: Window) {}

  pixels(property: string): number {
    const value = this.window.getComputedStyle(this.window.document.documentElement).getPropertyValue(property).trim();
    const pixels = PIXELS.exec(value)?.[1];
    if (pixels === undefined) throw new Error(`${property} is \`${value}\`, but a length in pixels is needed`);
    return Number(pixels);
  }
}
