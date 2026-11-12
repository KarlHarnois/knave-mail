import { Bridge } from "./Bridge";
import { CommandLine } from "./CommandLine";
import { DateLabel } from "./DateLabel";
import { ErrorReporter } from "./ErrorReporter";
import { FrameClock } from "./FrameClock";
import { LabelDirectory } from "./LabelDirectory";
import { ListWindow } from "./ListWindow";
import { MailClient } from "./MailClient";
import { MailSession } from "./MailSession";
import { RenderScheduler } from "./RenderScheduler";
import { StatusLine } from "./StatusLine";
import { SyncMonitor } from "./SyncMonitor";
import { SystemClipboard } from "./SystemClipboard";
import { TestDriver } from "./TestDriver";
import { ThreadActions } from "./ThreadActions";
import { ThreadList } from "./ThreadList";
import { ThreadRowRenderer } from "./ThreadRowRenderer";
import type { Transport } from "./Transport";
import { VimClipboard } from "./VimClipboard";
import { VimEditorFactory } from "./VimEditorFactory";
import { VimExCommands } from "./VimExCommands";

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
  readonly dates = new DateLabel();
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
    this.actions = new ThreadActions({ mail: this.mail, session: this.session, list: this.list, errors: this.errors });
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
}
