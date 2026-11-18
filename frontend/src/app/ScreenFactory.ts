import { DarkReaderWarmup } from "../darkmail/DarkReaderWarmup";
import { MailDarkening } from "../darkmail/MailDarkening";
import { HelpScreen } from "../help/HelpScreen";
import { WhichKeyPopup } from "../keys/WhichKeyPopup";
import { LabelPalette } from "../labels/LabelPalette";
import type { LabelRef } from "../mail/LabelDirectory";
import { TestDriver } from "../testing/TestDriver";
import { HtmlSandbox } from "../thread/HtmlSandbox";
import { ThemeMailFont } from "../thread/MailFont";
import type { MessageCardServices } from "../thread/MessageCard";
import { MessageLinks } from "../thread/MessageLinks";
import type { MailServices } from "./MailServices";
import type { ScreenHost } from "./ScreenHost";
import { ZoomControl } from "./ZoomControl";

export class ScreenFactory {
  readonly whichKey: WhichKeyPopup;

  constructor(private readonly services: MailServices) {
    this.whichKey = new WhichKeyPopup(services.document.defaultView ?? window);
  }

  mount(stage: HTMLElement): void {
    const { document, status, commandLine, palette } = this.services;
    const root = document.createElement("div");
    root.className = "app";
    status.holdCommandLine(commandLine.element);
    root.append(stage, palette.element, this.whichKey.element, status.element);
    document.body.append(root);
  }

  testDriver(pressToken: (token: string) => void, startup: Promise<unknown>): TestDriver {
    return new TestDriver({
      document: this.services.document,
      pressToken,
      bridge: this.services.bridge,
      scheduler: this.services.scheduler,
      startup,
    });
  }

  zoomControl(): ZoomControl {
    return new ZoomControl(
      (level) => this.services.errors.run(this.services.mail.zoom(level)),
      (notice) => this.services.status.showNotice(notice),
    );
  }

  stage(): HTMLElement {
    const stage = this.services.document.createElement("main");
    stage.className = "stage";
    return stage;
  }

  labelPalette(host: ScreenHost, goToLabel: (label: LabelRef) => void): LabelPalette {
    const { palette, labels, session, errors, status } = this.services;
    return new LabelPalette({
      palette,
      labels,
      session,
      errors,
      status,
      goToLabel,
      passKey: (token) => host.press(token),
      closed: () => host.refreshStatus(),
    });
  }

  helpScreen(host: ScreenHost): HelpScreen {
    return new HelpScreen({
      document: this.services.document,
      host,
      askSearch: (submit, counter) => this.services.commandLine.open("/", submit, { counter }),
      showError: (message) => this.services.status.showError(message),
    });
  }

  messageCardServices(): MessageCardServices {
    return {
      document: this.services.document,
      sandbox: this.sandbox(),
      darkening: new MailDarkening(this.services.document),
      dates: this.services.dates,
      editors: this.services.editors,
      links: new MessageLinks(this.services.mail),
    };
  }

  darkReaderWarmup(): DarkReaderWarmup {
    const document = this.services.document;
    return new DarkReaderWarmup(document, this.sandbox(), new MailDarkening(document));
  }

  private sandbox(): HtmlSandbox {
    return new HtmlSandbox(undefined, new ThemeMailFont(this.services.document));
  }
}
