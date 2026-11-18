const HINT_KEYS = "asdfghjkl";

export class HintLabels {
  static for(count: number): string[] {
    const length = HintLabels.lengthFor(count);
    return Array.from({ length: count }, (_, index) => HintLabels.label(index, length));
  }

  private static lengthFor(count: number): number {
    let length = 1;
    while (HINT_KEYS.length ** length < count) length++;
    return length;
  }

  private static label(index: number, length: number): string {
    let label = "";
    let rest = index;
    for (let place = 0; place < length; place++) {
      label = `${HINT_KEYS[rest % HINT_KEYS.length]}${label}`;
      rest = Math.floor(rest / HINT_KEYS.length);
    }
    return label;
  }
}
