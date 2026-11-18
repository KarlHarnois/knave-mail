import { ACTION_DESCRIPTIONS } from "../help/ActionDescriptions";
import { type Action, type KeyMode, LIST_BINDINGS, THREAD_BINDINGS } from "./KeyBindings";

const BINDINGS_BY_MODE: Readonly<Record<KeyMode, ReadonlyArray<readonly [string, Action]>>> = {
  list: LIST_BINDINGS,
  thread: THREAD_BINDINGS,
};

const LEADING_COUNT = /^\d+/;
const DELAY_TOKEN = "--component-which-key-delay";

type Continuation = { readonly key: string; readonly description: string };

export class WhichKeyPopup {
  readonly element: HTMLElement;
  private readonly list: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly window: Window) {
    const document = window.document;
    this.element = document.createElement("div");
    this.element.className = "which-key container container-raised";
    this.element.dataset["test"] = "which-key";
    this.element.hidden = true;
    this.list = document.createElement("ul");
    this.list.className = "which-key-list";
    this.element.append(this.list);
  }

  update(pending: string, mode: KeyMode | null): void {
    clearTimeout(this.timer);
    this.element.hidden = true;
    const continuations = this.continuations(pending.replace(LEADING_COUNT, ""), mode);
    if (continuations.length > 0) this.timer = setTimeout(() => this.show(continuations), this.delay());
  }

  private continuations(pressed: string, mode: KeyMode | null): Continuation[] {
    if (pressed === "" || mode === null) return [];
    return BINDINGS_BY_MODE[mode]
      .filter(([key]) => key.length > pressed.length && key.startsWith(pressed))
      .map(([key, action]) => ({ key: key.slice(pressed.length), description: ACTION_DESCRIPTIONS[action] }));
  }

  private show(continuations: readonly Continuation[]): void {
    this.list.replaceChildren(...continuations.map((continuation) => this.entry(continuation)));
    this.element.hidden = false;
  }

  private entry(continuation: Continuation): HTMLElement {
    const document = this.window.document;
    const item = document.createElement("li");
    const key = document.createElement("kbd");
    key.textContent = continuation.key;
    item.append(key, ` ${continuation.description}`);
    return item;
  }

  private delay(): number {
    const value = this.window.getComputedStyle(this.window.document.documentElement).getPropertyValue(DELAY_TOKEN);
    return Number.parseFloat(value) || 0;
  }
}
