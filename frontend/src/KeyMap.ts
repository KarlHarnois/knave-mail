import { KeyNotation } from "./KeyNotation";

export type KeyResult<A> =
  | { kind: "pending" }
  | { kind: "action"; action: A; count: number | null }
  | { kind: "unknown" };

const PENDING = { kind: "pending" } as const;
const UNKNOWN = { kind: "unknown" } as const;
const COUNT_DIGIT = /^[0-9]$/;

export class KeyMap<A> {
  private readonly bindings = new Map<string, A>();
  private readonly prefixes = new Set<string>();
  private buffer: string[] = [];
  private countDigits = "";

  constructor(bindings: ReadonlyArray<readonly [string, A]>, notation = new KeyNotation()) {
    for (const [keys, action] of bindings) this.bind(notation.tokenize(keys), action);
  }

  feed(token: string): KeyResult<A> {
    if (this.startsOrExtendsCount(token)) return this.addCountDigit(token);
    this.buffer.push(token);
    const sequence = this.buffer.join("");
    const action = this.bindings.get(sequence);
    if (action !== undefined) return this.complete(action);
    if (this.prefixes.has(sequence)) return PENDING;
    this.reset();
    return UNKNOWN;
  }

  pendingKeys(): string {
    return this.countDigits + this.buffer.join("");
  }

  reset(): void {
    this.buffer = [];
    this.countDigits = "";
  }

  private bind(tokens: string[], action: A): void {
    this.bindings.set(tokens.join(""), action);
    for (let length = 1; length < tokens.length; length++) this.prefixes.add(tokens.slice(0, length).join(""));
  }

  private startsOrExtendsCount(token: string): boolean {
    if (this.buffer.length > 0 || !COUNT_DIGIT.test(token)) return false;
    return token !== "0" || this.countDigits.length > 0;
  }

  private addCountDigit(digit: string): KeyResult<A> {
    this.countDigits += digit;
    return PENDING;
  }

  private complete(action: A): KeyResult<A> {
    const count = this.countDigits ? Number(this.countDigits) : null;
    this.reset();
    return { kind: "action", action, count };
  }
}
