import { IpcTransport } from "../bridge/IpcTransport";
import type { ThreadSummary } from "../bridge/Protocol";
import type { Transport } from "../bridge/Transport";
import { CommandRunner } from "../commands/CommandRunner";
import { ComposeScreen } from "../compose/ComposeScreen";
import type { HelpScreen } from "../help/HelpScreen";
import { KeyboardInput } from "../keys/KeyboardInput";
import type { LabelPickerScreen } from "../labels/LabelPickerScreen";
import { ListScreen } from "../list/ListScreen";
import { SharedActions } from "../mail/SharedActions";
import { HtmlSandbox } from "../thread/HtmlSandbox";
import { ThreadScreen } from "../thread/ThreadScreen";
import { App } from "./App";
import { AppKeyMaps } from "./AppKeyMaps";
import { FocusGuard } from "./FocusGuard";
import { MailServices } from "./MailServices";
import { Navigator } from "./Navigator";
import { ScreenFactory } from "./ScreenFactory";

export class KnaveMail {
  private readonly services: MailServices;
  private readonly factory: ScreenFactory;
  private readonly stage: HTMLElement;
  private readonly navigator: Navigator;
  private readonly shared: SharedActions;
  private readonly app: App;
  private readonly threadScreen: ThreadScreen;
  private readonly composeScreen: ComposeScreen;
  private readonly helpScreen: HelpScreen;
  private readonly labelPicker: LabelPickerScreen;

  constructor(
    private readonly window: Window,
    transport: Transport = new IpcTransport(window as never),
  ) {
    this.services = new MailServices(window, transport);
    this.factory = new ScreenFactory(this.services);
    this.stage = this.factory.stage();
    this.navigator = new Navigator(this.stage, this.createListScreen());
    this.shared = this.createSharedActions();
    this.app = this.createApp();
    this.threadScreen = this.createThreadScreen();
    this.composeScreen = this.createComposeScreen();
    this.helpScreen = this.factory.helpScreen(this.app);
    this.labelPicker = this.factory.labelPicker(this.app, (label) => this.shared.goToLabel(label));
  }

  start(): void {
    this.mount();
    new KeyboardInput((token) => this.app.press(token)).listen(this.services.document);
    new FocusGuard(this.window, () => this.app.focusScreen()).watch();
    this.factory.zoomControl().listen(this.services.document);
    const startup = this.services.session.start();
    this.factory.testDriver((token) => this.app.press(token), startup).installOn(this.window);
    this.app.refreshStatus();
    this.services.errors.run(startup);
  }

  private mount(): void {
    const root = this.services.document.createElement("div");
    root.className = "app";
    root.append(this.stage, this.services.commandLine.element, this.services.status.element);
    this.services.document.body.append(root);
    this.app.focusScreen();
  }

  private goBack(): void {
    if (!this.navigator.isAtRoot) this.navigator.current.perform("back", null);
    else if (this.services.session.isSearching) this.services.errors.run(this.services.session.clearSearch());
  }

  private createListScreen(): ListScreen {
    return new ListScreen(this.services.list, this.services.actions, {
      openThread: (summary) => this.threadScreen.open(summary),
      startSearch: () => this.shared.startSearch(),
      clearError: () => this.services.status.clearError(),
    });
  }

  private createSharedActions(): SharedActions {
    const commands = new CommandRunner({
      session: this.services.session,
      sync: this.services.sync,
      errors: this.services.errors,
      status: this.services.status,
      goBack: () => this.goBack(),
      showList: () => this.app.showList(),
      showHelp: () => this.helpScreen.open(),
    });
    return new SharedActions({
      commandLine: this.services.commandLine,
      commands,
      session: this.services.session,
      sync: this.services.sync,
      errors: this.services.errors,
      status: this.services.status,
      startCompose: () => this.composeScreen.resume(),
      showList: () => this.app.showList(),
      showHelp: () => this.helpScreen.open(),
      pickLabel: () => this.labelPicker.open(),
    });
  }

  private createApp(): App {
    return new App({
      status: this.services.status,
      commandLine: this.services.commandLine,
      keys: new AppKeyMaps().create(),
      navigator: this.navigator,
      errors: this.services.errors,
      shared: this.shared,
    });
  }

  private createThreadScreen(): ThreadScreen {
    return new ThreadScreen({
      host: this.app,
      mail: this.services.mail,
      session: this.services.session,
      actions: this.services.actions,
      errors: this.services.errors,
      cards: {
        document: this.services.document,
        sandbox: new HtmlSandbox(),
        dates: this.services.dates,
        editors: this.services.editors,
      },
      openDraft: (draft) => this.composeScreen.open(draft),
      neighbourThread: (offset) => this.selectNeighbour(offset),
    });
  }

  private selectNeighbour(offset: number): ThreadSummary | undefined {
    this.services.list.moveBy(offset);
    return this.services.list.selected();
  }

  private createComposeScreen(): ComposeScreen {
    return new ComposeScreen({
      document: this.services.document,
      host: this.app,
      mail: this.services.mail,
      session: this.services.session,
      errors: this.services.errors,
      status: this.services.status,
      editors: this.services.editors,
    });
  }
}
