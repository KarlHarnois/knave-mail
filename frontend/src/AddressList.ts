const SEPARATOR = ", ";

export class AddressList {
  split(text: string): string[] {
    const addresses: string[] = [];
    let current = "";
    let quoted = false;
    let angleDepth = 0;
    for (const character of text) {
      if (character === '"') quoted = !quoted;
      else if (character === "<" && !quoted) angleDepth++;
      else if (character === ">" && !quoted) angleDepth = Math.max(0, angleDepth - 1);
      const separates = character === "," && !quoted && angleDepth === 0;
      if (separates) addresses.push(current);
      current = separates ? "" : current + character;
    }
    addresses.push(current);
    return addresses.map((address) => address.trim()).filter((address) => address.length > 0);
  }

  join(addresses: readonly string[]): string {
    return addresses.join(SEPARATOR);
  }
}
