import type { Screen } from "../app/Screen";
import type { ScreenHost } from "../app/ScreenHost";
import { CursorKeys } from "../rows/CursorKeys";
import { HelpContent } from "./HelpContent";
import { HelpRows } from "./HelpRows";

export type HelpScreenPorts = {
  document: Document;
  host: ScreenHost;
  askSearch: (submit: (query: string) => void) => void;
  showError: (message: string) => void;
};

export class HelpScreen implements Screen {
  readonly keyMode = null;
  readonly element: HTMLElement;
  private readonly keys: CursorKeys;

  constructor(private readonly ports: HelpScreenPorts) {
    this.element = ports.document.createElement("section");
    this.element.className = "help-view";
    this.element.dataset["test"] = "help-view";
    this.element.tabIndex = -1;
    const rows = new HelpRows(ports.document, new HelpContent().sections());
    this.element.append(rows.element);
    this.keys = new CursorKeys(
      {
        rows: rows.cursor,
        viewportHeight: () => this.element.clientHeight,
        askSearch: ports.askSearch,
        showError: (message) => ports.showError(`help: ${message}`),
        choose: () => undefined,
        close: () => ports.host.back(),
      },
      [["?", "close"]],
    );
  }

  open(): void {
    this.ports.host.push(this);
  }

  modeName(): string {
    return "HELP";
  }

  capturesKeys(): boolean {
    return true;
  }

  pressCaptured(token: string): void {
    this.keys.press(token);
  }

  perform(): void {}

  focus(): void {
    this.element.focus({ preventScroll: true });
  }
}
