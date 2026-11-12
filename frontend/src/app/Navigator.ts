import type { Screen } from "./Screen";

export class Navigator {
  private readonly stack: Screen[] = [];

  constructor(
    private readonly stage: HTMLElement,
    root: Screen,
  ) {
    this.push(root);
  }

  get current(): Screen {
    const screen = this.stack.at(-1);
    if (!screen) throw new Error("the navigator lost its root screen");
    return screen;
  }

  get isAtRoot(): boolean {
    return this.stack.length === 1;
  }

  push(screen: Screen): void {
    if (this.stack.at(-1) === screen) return;
    this.stack.at(-1)?.element.setAttribute("hidden", "");
    this.removeFromStack(screen);
    this.stack.push(screen);
    if (screen.element.parentElement !== this.stage) this.stage.append(screen.element);
    screen.element.removeAttribute("hidden");
  }

  back(): void {
    if (this.isAtRoot) return;
    this.stack.pop()?.element.setAttribute("hidden", "");
    this.current.element.removeAttribute("hidden");
  }

  backToRoot(): void {
    while (!this.isAtRoot) this.back();
  }

  private removeFromStack(screen: Screen): void {
    const index = this.stack.indexOf(screen);
    if (index >= 0) this.stack.splice(index, 1);
  }
}
