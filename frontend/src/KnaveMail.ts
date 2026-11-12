import { App } from "./App";
import { Bridge } from "./Bridge";
import { CommandLine } from "./CommandLine";
import { CommandRunner } from "./CommandRunner";
import { ComposeScreen } from "./ComposeScreen";
import { DateLabel } from "./DateLabel";
import { ErrorReporter } from "./ErrorReporter";
import { FocusGuard } from "./FocusGuard";
import { FrameClock } from "./FrameClock";
import { HtmlSandbox } from "./HtmlSandbox";
import { IpcTransport } from "./IpcTransport";
import { type Action, type KeyMode, LIST_BINDINGS, THREAD_BINDINGS } from "./KeyBindings";
import { KeyboardInput } from "./KeyboardInput";
import { KeyMap } from "./KeyMap";
import { LabelDirectory } from "./LabelDirectory";
import { ListScreen } from "./ListScreen";
import { ListWindow } from "./ListWindow";
import { MailClient } from "./MailClient";
import { MailSession } from "./MailSession";
import { ModalKeyMap } from "./ModalKeyMap";
import { Navigator } from "./Navigator";
import { RenderScheduler } from "./RenderScheduler";
import { SharedActions } from "./SharedActions";
import { StatusLine } from "./StatusLine";
import { SyncMonitor } from "./SyncMonitor";
import { SystemClipboard } from "./SystemClipboard";
import { TestDriver, type TestDriverApi } from "./TestDriver";
import { ThreadActions } from "./ThreadActions";
import { ThreadList } from "./ThreadList";
import { ThreadRowRenderer } from "./ThreadRowRenderer";
import type { ThreadSummary } from "./Protocol";
import { ThreadScreen } from "./ThreadScreen";
import type { Transport } from "./Transport";
import { VimClipboard } from "./VimClipboard";
import { VimEditorFactory } from "./VimEditorFactory";
import { VimExCommands } from "./VimExCommands";

const ROW_HEIGHT = 30;
const OVERSCAN_ROWS = 10;

type DriverWindow = Window & { knaveTestDriver?: TestDriverApi };

export class KnaveMail {
  private readonly document: Document;
  private readonly status: StatusLine;
  private readonly commandLine: CommandLine;
  private readonly errors: ErrorReporter;
  private readonly bridge: Bridge;
  private readonly mail: MailClient;
  private readonly scheduler: RenderScheduler;
  private readonly dates = new DateLabel();
  private readonly list: ThreadList;
  private readonly labels: LabelDirectory;
  private readonly session: MailSession;
  private readonly sync: SyncMonitor;
  private readonly editors: VimEditorFactory;
  private readonly actions: ThreadActions;
  private readonly stage: HTMLElement;
  private readonly navigator: Navigator;
  private readonly shared: SharedActions;
  private readonly app: App;
  private readonly threadScreen: ThreadScreen;
  private readonly composeScreen: ComposeScreen;

  constructor(
    private readonly window: Window,
    transport: Transport = new IpcTransport(window as never),
  ) {
    this.document = window.document;
    this.status = new StatusLine(this.document);
    this.commandLine = new CommandLine(this.document);
    this.errors = new ErrorReporter(this.status);
    this.bridge = new Bridge(transport);
    this.mail = new MailClient(this.bridge);
    this.scheduler = this.createScheduler();
    this.list = this.createThreadList();
    this.labels = new LabelDirectory(this.mail);
    this.session = new MailSession(this.mail, this.list, this.labels, this.status);
    this.sync = this.createSyncMonitor();
    this.editors = this.createEditors();
    this.actions = new ThreadActions(this.mail, this.session, this.list, this.errors);
    this.stage = this.createStage();
    this.navigator = new Navigator(this.stage, this.createListScreen());
    this.shared = this.createSharedActions();
    this.app = this.createApp();
    this.threadScreen = this.createThreadScreen();
    this.composeScreen = this.createComposeScreen();
  }

  start(): void {
    this.mount();
    new KeyboardInput((token) => this.app.press(token)).listen(this.document);
    new FocusGuard(this.window, () => this.app.focusScreen()).watch();
    const driver = new TestDriver(this.document, (token) => this.app.press(token), this.bridge, this.scheduler);
    (this.window as DriverWindow).knaveTestDriver = driver.api();
    this.app.refreshStatus();
    this.errors.run(this.session.start());
  }

  private mount(): void {
    const root = this.document.createElement("div");
    root.className = "app";
    root.append(this.stage, this.commandLine.element, this.status.element);
    this.document.body.append(root);
    this.app.focusScreen();
  }

  private goBack(): void {
    if (!this.navigator.isAtRoot) this.navigator.current.perform("back", null);
    else if (this.session.isSearching) this.errors.run(this.session.clearSearch());
  }

  private createScheduler(): RenderScheduler {
    const clock = new FrameClock(this.window);
    return new RenderScheduler((callback) => clock.request(callback));
  }

  private createThreadList(): ThreadList {
    const rows = new ThreadRowRenderer(this.document, this.dates);
    return new ThreadList(this.document, new ListWindow(ROW_HEIGHT, OVERSCAN_ROWS), rows, this.scheduler);
  }

  private createSyncMonitor(): SyncMonitor {
    const sync = new SyncMonitor(this.mail, this.session, this.labels, this.status, this.errors, this.dates);
    this.bridge.subscribe((event) => sync.handle(event));
    this.session.onAccountChange((account) => sync.showStateOf(account));
    return sync;
  }

  private createEditors(): VimEditorFactory {
    const exCommands = new VimExCommands();
    exCommands.install();
    const clipboard = new SystemClipboard(this.window.navigator, (message) => this.status.showError(message));
    new VimClipboard(clipboard).install();
    return new VimEditorFactory(exCommands);
  }

  private createStage(): HTMLElement {
    const stage = this.document.createElement("main");
    stage.className = "stage";
    return stage;
  }

  private createListScreen(): ListScreen {
    return new ListScreen(this.list, this.actions, {
      openThread: (summary) => this.threadScreen.open(summary),
      startSearch: () => this.shared.startSearch(),
    });
  }

  private createSharedActions(): SharedActions {
    const commands = new CommandRunner({
      session: this.session,
      sync: this.sync,
      errors: this.errors,
      status: this.status,
      goBack: () => this.goBack(),
      showList: () => this.app.showList(),
    });
    return new SharedActions({
      commandLine: this.commandLine,
      commands,
      session: this.session,
      sync: this.sync,
      errors: this.errors,
      status: this.status,
      startCompose: () => this.composeScreen.resume(),
      showList: () => this.app.showList(),
    });
  }

  private createApp(): App {
    const keyMaps = new Map<KeyMode, KeyMap<Action>>([
      ["list", new KeyMap<Action>(LIST_BINDINGS)],
      ["thread", new KeyMap<Action>(THREAD_BINDINGS)],
    ]);
    return new App({
      status: this.status,
      commandLine: this.commandLine,
      keys: new ModalKeyMap(keyMaps, "list"),
      navigator: this.navigator,
      errors: this.errors,
      shared: this.shared,
    });
  }

  private createThreadScreen(): ThreadScreen {
    return new ThreadScreen({
      host: this.app,
      mail: this.mail,
      session: this.session,
      actions: this.actions,
      errors: this.errors,
      cards: { document: this.document, sandbox: new HtmlSandbox(), dates: this.dates, editors: this.editors },
      openDraft: (draft) => this.composeScreen.open(draft),
      neighbourThread: (offset) => this.selectNeighbour(offset),
    });
  }

  private selectNeighbour(offset: number): ThreadSummary | undefined {
    this.list.moveBy(offset);
    return this.list.selected();
  }

  private createComposeScreen(): ComposeScreen {
    return new ComposeScreen({
      document: this.document,
      host: this.app,
      mail: this.mail,
      session: this.session,
      errors: this.errors,
      status: this.status,
      editors: this.editors,
    });
  }
}
