import { Bridge } from "../bridge/Bridge";
import { MailClient } from "../bridge/MailClient";
import type { Transport } from "../bridge/Transport";
import { CommandLine } from "../commands/CommandLine";
import { ListWindow } from "../list/ListWindow";
import { ThreadList } from "../list/ThreadList";
import { ThreadRowRenderer } from "../list/ThreadRowRenderer";
import { Logger } from "../logging/Logger";
import { LabelDirectory } from "../mail/LabelDirectory";
import { MailSession } from "../mail/MailSession";
import { PendingChanges } from "../mail/PendingChanges";
import { SyncMonitor } from "../mail/SyncMonitor";
import { ThreadActions } from "../mail/ThreadActions";
import { DateLabel } from "../render/DateLabel";
import { FrameClock } from "../render/FrameClock";
import { RenderScheduler } from "../render/RenderScheduler";
import { ErrorReporter } from "../status/ErrorReporter";
import { StatusLine } from "../status/StatusLine";
import { SystemClipboard } from "../vim/SystemClipboard";
import { VimClipboard } from "../vim/VimClipboard";
import { VimEditorFactory } from "../vim/VimEditorFactory";
import { VimExCommands } from "../vim/VimExCommands";
import { VimKeymap } from "../vim/VimKeymap";
import { VimPrompts } from "../vim/VimPrompts";

const ROW_HEIGHT = 30;
const OVERSCAN_ROWS = 10;

export class MailServices {
  readonly document: Document;
  readonly status: StatusLine;
  readonly commandLine: CommandLine;
  readonly errors: ErrorReporter;
  readonly logger: Logger;
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
  private readonly pending = new PendingChanges();

  constructor(
    private readonly window: Window,
    transport: Transport,
  ) {
    this.document = window.document;
    this.status = new StatusLine(this.document);
    this.commandLine = new CommandLine(this.document);
    this.logger = new Logger(transport);
    this.errors = new ErrorReporter(this.status, this.logger);
    this.bridge = new Bridge(transport);
    this.mail = new MailClient(this.bridge);
    this.scheduler = this.createScheduler();
    this.list = this.createThreadList();
    this.labels = new LabelDirectory(this.mail);
    this.session = this.createSession();
    this.sync = this.createSyncMonitor();
    this.editors = this.createEditors();
    this.actions = this.createThreadActions();
  }

  launched(): void {
    this.logger.info(`inbox shown ${Math.round(performance.now())}ms after launch`);
    this.sync.syncOnLaunch();
  }

  private createSession(): MailSession {
    const { mail, list, labels, status, pending } = this;
    return new MailSession({ mail, list, labels, status, pending });
  }

  private createThreadActions(): ThreadActions {
    return new ThreadActions({
      mail: this.mail,
      session: this.session,
      list: this.list,
      errors: this.errors,
      pending: this.pending,
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
    const keymap = new VimKeymap();
    keymap.apply(keymap.entriesOf(this.window));
    return new VimEditorFactory(
      exCommands,
      new VimPrompts({ document: this.document, commandLine: this.commandLine, status: this.status }),
    );
  }
}
