import { KeyNotation } from "./KeyNotation";

const EDITOR_SELECTOR = ".cm-editor";

export class KeyboardInput {
  constructor(
    private readonly press: (token: string) => void,
    private readonly notation: KeyNotation = new KeyNotation(),
  ) {}

  listen(target: Document): void {
    target.addEventListener("keydown", (event) => this.handle(event));
  }

  private handle(event: KeyboardEvent): void {
    if (this.belongsToEditor(event.target)) return;
    const token = this.notation.fromEvent(event);
    if (token === null) return;
    event.preventDefault();
    this.press(token);
  }

  private belongsToEditor(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(EDITOR_SELECTOR) !== null;
  }
}
