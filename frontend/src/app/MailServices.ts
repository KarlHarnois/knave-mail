import { Bridge } from "../bridge/Bridge";
import { MailClient } from "../bridge/MailClient";
import type { Transport } from "../bridge/Transport";
import { CommandLine } from "../commands/CommandLine";
import { HelpScreen } from "../help/HelpScreen";
import { LabelPickerScreen } from "../labels/LabelPickerScreen";
import { ListWindow } from "../list/ListWindow";
import { ThreadList } from "../list/ThreadList";
import { ThreadRowRenderer } from "../list/ThreadRowRenderer";
import type { LabelRef } from "../mail/LabelDirectory";
import { LabelDirectory } from "../mail/LabelDirectory";
import { MailSession } from "../mail/MailSession";
import { SyncMonitor } from "../mail/SyncMonitor";
import { ThreadActions } from "../mail/ThreadActions";
import { DateLabel } from "../render/DateLabel";
import { FrameClock } from "../render/FrameClock";
import { RenderScheduler } from "../render/RenderScheduler";
import { ErrorReporter } from "../status/ErrorReporter";
import { StatusLine } from "../status/StatusLine";
import { TestDriver } from "../testing/TestDriver";
import { SystemClipboard } from "../vim/SystemClipboard";
import { VimClipboard } from "../vim/VimClipboard";
import { VimEditorFactory } from "../vim/VimEditorFactory";
import { VimExCommands } from "../vim/VimExCommands";
import type { ScreenHost } from "./ScreenHost";
import { ZoomControl } from "./ZoomControl";

const ROW_HEIGHT = 30;
const OVERSCAN_ROWS = 10;

export class MailServices {
  readonly document: Document;
  readonly status: StatusLine;
  readonly commandLine: CommandLine;
  readonly errors: ErrorReporter;
  readonly bridge: Bridge;
  readonly mail: MailClient;
  readonly scheduler: RenderScheduler;
  readonly dates: DateLabel = new DateLabel();
  readonly list: ThreadList;
  readonly labels: LabelDirectory;
  readonly session: MailSession;
  readonly sync: SyncMonitor;
  readonly editors: VimEditorFactory;
  readonly actions: ThreadActions;

  constructor(
    private readonly window: Window,
    transport: Transport,
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
    this.session = new MailSession({ mail: this.mail, list: this.list, labels: this.labels, status: this.status });
    this.sync = this.createSyncMonitor();
    this.editors = this.createEditors();
    this.actions = new ThreadActions({
      mail: this.mail,
      session: this.session,
      list: this.list,
      errors: this.errors,
      notify: (notice) => this.status.showNotice(notice),
    });
  }

  private createScheduler(): RenderScheduler {
    const clock = new FrameClock(this.window);
    return new RenderScheduler((callback) => clock.request(callback));
  }

  private createThreadList(): ThreadList {
    const rows = new ThreadRowRenderer(this.document, this.dates);
    return new ThreadList({
      document: this.document,
      listWindow: new ListWindow(ROW_HEIGHT, OVERSCAN_ROWS),
      rows,
      scheduler: this.scheduler,
    });
  }

  private createSyncMonitor(): SyncMonitor {
    const sync = new SyncMonitor({
      mail: this.mail,
      session: this.session,
      labels: this.labels,
      status: this.status,
      errors: this.errors,
      dates: this.dates,
    });
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

  testDriver(pressToken: (token: string) => void, startup: Promise<unknown>): TestDriver {
    return new TestDriver({
      document: this.document,
      pressToken,
      bridge: this.bridge,
      scheduler: this.scheduler,
      startup,
    });
  }

  zoomControl(): ZoomControl {
    return new ZoomControl(this.document.documentElement, (notice) => this.status.showNotice(notice));
  }

  stage(): HTMLElement {
    const stage = this.document.createElement("main");
    stage.className = "stage";
    return stage;
  }

  labelPicker(host: ScreenHost, goToLabel: (label: LabelRef) => void): LabelPickerScreen {
    return new LabelPickerScreen({
      document: this.document,
      host,
      labels: this.labels,
      session: this.session,
      errors: this.errors,
      askSearch: (submit) => this.commandLine.open("/", submit),
      goToLabel,
    });
  }

  helpScreen(host: ScreenHost): HelpScreen {
    return new HelpScreen({
      document: this.document,
      host,
      askSearch: (submit) => this.commandLine.open("/", submit),
      showError: (message) => this.status.showError(message),
    });
  }
}
