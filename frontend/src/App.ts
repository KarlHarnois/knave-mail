import type { CommandLine } from "./CommandLine";
import type { ErrorReporter } from "./ErrorReporter";
import type { Action, KeyMode } from "./KeyBindings";
import type { ModalKeyMap } from "./ModalKeyMap";
import type { Navigator } from "./Navigator";
import type { Screen } from "./Screen";
import type { ScreenHost } from "./ScreenHost";
import type { SharedActions } from "./SharedActions";
import type { StatusLine } from "./StatusLine";

export type AppPorts = {
  status: StatusLine;
  commandLine: CommandLine;
  keys: ModalKeyMap<KeyMode, Action>;
  navigator: Navigator;
  errors: ErrorReporter;
  shared: SharedActions;
};

const PROMPT_MODES: Readonly<Record<string, string>> = { ":": "COMMAND", "/": "SEARCH" };

export class App implements ScreenHost {
  constructor(private readonly ports: AppPorts) {}

  press(token: string): void {
    try {
      this.route(token);
    } catch (error) {
      this.ports.errors.report(error);
    }
    this.refreshStatus();
  }

  push(screen: Screen): void {
    this.ports.navigator.push(screen);
    this.enter(screen);
  }

  back(): void {
    this.ports.navigator.back();
    this.enter(this.screen());
  }

  showList(): void {
    this.ports.navigator.backToRoot();
    this.enter(this.screen());
  }

  refreshStatus(): void {
    this.ports.status.showMode(this.modeName());
    this.ports.status.showPendingKeys(this.ports.keys.pendingKeys());
  }

  focusScreen(): void {
    this.screen().focus();
  }

  private route(token: string): void {
    const screen = this.screen();
    if (this.ports.commandLine.isOpen) this.ports.commandLine.press(token);
    else if (screen.capturesKeys()) screen.pressCaptured(token);
    else this.feedKeyMap(token, screen);
  }

  private feedKeyMap(token: string, screen: Screen): void {
    const result = this.ports.keys.feed(token);
    if (result.kind !== "action") return;
    if (this.ports.shared.handles(result.action)) this.ports.shared.perform(result.action);
    else screen.perform(result.action, result.count);
  }

  private enter(screen: Screen): void {
    if (screen.keyMode) this.ports.keys.switchTo(screen.keyMode);
    screen.focus();
    this.refreshStatus();
  }

  private modeName(): string {
    const commandLine = this.ports.commandLine;
    return commandLine.isOpen ? (PROMPT_MODES[commandLine.prompt] ?? "COMMAND") : this.screen().modeName();
  }

  private screen(): Screen {
    return this.ports.navigator.current;
  }
}
