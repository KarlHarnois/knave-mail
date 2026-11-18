import type { ScreenHost } from "../app/ScreenHost";
import { HintLabels } from "./HintLabels";
import type { LinkTarget } from "./MessageLinks";

type Hint = { label: string; url: string; element: HTMLElement };
type LinkChoice = (url: string) => void;

const ESCAPE = "<Esc>";

export class LinkHints {
  private readonly overlay: HTMLElement;
  private hints: Hint[] = [];
  private typed = "";
  private choose: LinkChoice = () => {};

  constructor(
    private readonly document: Document,
    private readonly host: ScreenHost,
  ) {
    this.overlay = document.createElement("div");
    this.overlay.className = "link-hints";
    this.overlay.dataset["test"] = "link-hints";
  }

  get isActive(): boolean {
    return this.hints.length > 0;
  }

  modeName(): string {
    return "LINK";
  }

  show(targets: readonly LinkTarget[], choose: LinkChoice): void {
    const visible = targets.filter((target) => this.isOnScreen(target));
    const labels = HintLabels.for(visible.length);
    this.hints = visible.map((target, index) => this.hintFor(labels[index] ?? "", target));
    this.choose = choose;
    this.overlay.replaceChildren(...this.hints.map((hint) => hint.element));
    this.document.body.append(this.overlay);
    this.host.refreshStatus();
  }

  press(token: string): void {
    this.typed = token === ESCAPE ? "" : `${this.typed}${token}`;
    const matching = this.matchingHints();
    const chosen = matching.find((hint) => hint.label === this.typed);
    if (chosen || matching.length === 0) this.finish(chosen);
    else this.showOnly(matching);
  }

  leave(): void {
    this.hints = [];
    this.typed = "";
    this.overlay.remove();
  }

  private matchingHints(): Hint[] {
    if (!this.typed) return [];
    return this.hints.filter((hint) => hint.label.startsWith(this.typed));
  }

  private showOnly(matching: readonly Hint[]): void {
    for (const hint of this.hints) hint.element.hidden = !matching.includes(hint);
  }

  private finish(chosen: Hint | undefined): void {
    this.leave();
    this.host.refreshStatus();
    if (chosen) this.choose(chosen.url);
  }

  private hintFor(label: string, target: LinkTarget): Hint {
    const element = this.document.createElement("span");
    element.className = "link-hint";
    element.dataset["test"] = "link-hint";
    element.textContent = label;
    element.style.top = `${target.top}px`;
    element.style.left = `${target.left}px`;
    return { label, url: target.url, element };
  }

  private isOnScreen(target: LinkTarget): boolean {
    const height = this.document.defaultView?.innerHeight ?? 0;
    return target.top >= 0 && target.top < height;
  }
}
