const NAMED_KEYS: Readonly<Record<string, string>> = {
  cr: "<CR>",
  enter: "<CR>",
  return: "<CR>",
  esc: "<Esc>",
  bs: "<BS>",
  backspace: "<BS>",
  tab: "<Tab>",
  space: " ",
  lt: "<",
  up: "<Up>",
  down: "<Down>",
  left: "<Left>",
  right: "<Right>",
  del: "<Del>",
};

const EVENT_KEYS: Readonly<Record<string, string>> = {
  Enter: "<CR>",
  Escape: "<Esc>",
  Backspace: "<BS>",
  Tab: "<Tab>",
  ArrowUp: "<Up>",
  ArrowDown: "<Down>",
  ArrowLeft: "<Left>",
  ArrowRight: "<Right>",
  Delete: "<Del>",
};

const BRACKETED_KEY = /^<([^<>]+)>/;
const CONTROL_PREFIX = /^c-(.)$/i;

export class KeyNotation {
  tokenize(sequence: string): string[] {
    const tokens: string[] = [];
    let rest = sequence;
    while (rest.length > 0) {
      const [token, length] = this.nextToken(rest);
      tokens.push(token);
      rest = rest.slice(length);
    }
    return tokens;
  }

  fromEvent(event: KeyboardEvent): string | null {
    if (event.altKey || event.metaKey) return null;
    if (event.ctrlKey) return this.controlToken(event.key);
    if (event.key in EVENT_KEYS) return EVENT_KEYS[event.key] ?? null;
    return event.key.length === 1 ? event.key : null;
  }

  isPrintable(token: string): boolean {
    return token.length === 1;
  }

  private nextToken(rest: string): [string, number] {
    const bracketed = BRACKETED_KEY.exec(rest);
    const named = bracketed ? this.namedToken(bracketed[1] ?? "") : null;
    if (bracketed && named) return [named, bracketed[0].length];
    return [rest.charAt(0), 1];
  }

  private namedToken(name: string): string | null {
    const control = CONTROL_PREFIX.exec(name);
    if (control) return this.controlToken(control[1] ?? "");
    return NAMED_KEYS[name.toLowerCase()] ?? null;
  }

  private controlToken(key: string): string | null {
    return key.length === 1 ? `<C-${key.toLowerCase()}>` : null;
  }
}
