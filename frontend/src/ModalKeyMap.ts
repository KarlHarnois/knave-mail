import type { KeyMap, KeyResult } from "./KeyMap";

export class ModalKeyMap<M, A> {
  private current: KeyMap<A>;

  constructor(
    private readonly keyMaps: ReadonlyMap<M, KeyMap<A>>,
    private activeMode: M,
  ) {
    this.current = this.keyMapFor(activeMode);
  }

  get mode(): M {
    return this.activeMode;
  }

  switchTo(mode: M): void {
    this.current.reset();
    this.activeMode = mode;
    this.current = this.keyMapFor(mode);
  }

  feed(token: string): KeyResult<A> {
    return this.current.feed(token);
  }

  pendingKeys(): string {
    return this.current.pendingKeys();
  }

  private keyMapFor(mode: M): KeyMap<A> {
    const keyMap = this.keyMaps.get(mode);
    if (!keyMap) throw new Error(`no key map for mode ${String(mode)}`);
    return keyMap;
  }
}
