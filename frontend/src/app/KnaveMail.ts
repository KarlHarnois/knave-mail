import { IpcTransport } from "../bridge/IpcTransport";
import type { ThreadSummary } from "../bridge/Protocol";
import type { Transport } from "../bridge/Transport";
import { ComposeScreen } from "../compose/ComposeScreen";
import type { HelpScreen } from "../help/HelpScreen";
import { KeyboardInput } from "../keys/KeyboardInput";
import { KeyNotation } from "../keys/KeyNotation";
import type { LabelPalette } from "../labels/LabelPalette";
import { ListScreen } from "../list/ListScreen";
import { GlobalErrorLog } from "../logging/GlobalErrorLog";
import { SharedActions } from "../mail/SharedActions";
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
  private readonly labelPalette: LabelPalette;

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
    this.labelPalette = this.factory.labelPalette(this.app, (label) => this.shared.goToLabel(label));
  }

  start(): void {
    this.mount();
    new GlobalErrorLog(this.window, this.services.logger).watch();
    new KeyboardInput((token) => this.app.press(token)).listen(this.services.document);
    new FocusGuard(this.window, () => this.app.focusScreen()).watch();
    this.factory.zoomControl().listen(this.services.document);
    this.factory.darkReaderWarmup().start();
    const startup = this.services.session.start(this.services.startAccount).then(() => this.services.launched());
    this.factory.testDriver((token) => this.app.press(token), startup).installOn(this.window);
    this.app.refreshStatus();
    this.services.errors.run(startup);
  }

  private mount(): void {
    this.factory.mount(this.stage);
    this.app.focusScreen();
  }

  private pressKeys(keys: string): void {
    for (const token of new KeyNotation().tokenize(keys)) this.app.press(token);
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
      nearEnd: () => this.services.errors.run(this.services.session.showMore()),
    });
  }

  private createSharedActions(): SharedActions {
    return new SharedActions({
      commandLine: this.services.commandLine,
      palette: this.services.palette,
      pressKeys: (keys) => this.pressKeys(keys),
      keyMode: () => this.navigator.current.keyMode,
      session: this.services.session,
      sync: this.services.sync,
      errors: this.services.errors,
      status: this.services.status,
      startCompose: () => this.composeScreen.resume(),
      showList: () => this.app.showList(),
      showHelp: () => this.helpScreen.open(),
      pickLabel: () => this.labelPalette.open(),
      goBack: () => this.goBack(),
      archiveOlder: (before) => this.services.olderMail.archive(before),
    });
  }

  private createApp(): App {
    return new App({
      status: this.services.status,
      commandLine: this.services.commandLine,
      palette: this.services.palette,
      whichKey: this.factory.whichKey,
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
      logger: this.services.logger,
      clipboard: this.services.clipboard,
      cards: this.factory.messageCardServices(),
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
      afterSending: () => this.threadScreen.refresh(),
    });
  }
}
