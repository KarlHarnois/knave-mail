const LUMINANCE_SPLIT = 0.5;
const COLOR_CHANNELS = 3;
const CHANNEL_MAXIMUM = 255;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const TRANSPARENT_ALPHA = 0;

export class ColorTone {
  isDark(color: string): boolean {
    const [red = CHANNEL_MAXIMUM, green = CHANNEL_MAXIMUM, blue = CHANNEL_MAXIMUM] = this.channels(color);
    const luminance = (RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue) / CHANNEL_MAXIMUM;
    return luminance < LUMINANCE_SPLIT;
  }

  isTransparent(color: string): boolean {
    return color === "transparent" || this.channels(color, COLOR_CHANNELS + 1)[COLOR_CHANNELS] === TRANSPARENT_ALPHA;
  }

  private channels(color: string, count = COLOR_CHANNELS): number[] {
    return (
      color
        .match(/\d+(\.\d+)?/g)
        ?.slice(0, count)
        .map(Number) ?? []
    );
  }
}
