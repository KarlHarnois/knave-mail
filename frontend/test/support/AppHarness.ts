import { EditorView } from "@codemirror/view";
import { KnaveMail } from "../../src/KnaveMail";
import type { TestDriverApi } from "../../src/TestDriver";
import { FakeCore } from "./FakeCore";

type DriverWindow = Window & { knaveTestDriver?: TestDriverApi };

export class AppHarness {
  readonly core = new FakeCore();
  readonly driver: TestDriverApi;

  private constructor() {
    AppHarness.destroyEditors();
    document.body.replaceChildren();
    new KnaveMail(window, this.core).start();
    const driver = (window as DriverWindow).knaveTestDriver;
    if (!driver) throw new Error("window.knaveTestDriver was not installed");
    this.driver = driver;
  }

  static async started(configure: (core: FakeCore) => void = () => {}): Promise<AppHarness> {
    const harness = new AppHarness();
    configure(harness.core);
    await harness.driver.whenIdle();
    return harness;
  }

  private static destroyEditors(): void {
    for (const editor of document.querySelectorAll<HTMLElement>(".cm-editor")) EditorView.findFromDOM(editor)?.destroy();
  }

  async press(keys: string): Promise<void> {
    this.driver.press(keys);
    await this.driver.whenIdle();
  }

  status(field: string): string {
    return this.driver.text(`[data-test="status-${field}"]`);
  }

  selectedThreadId(): string | undefined {
    return document.querySelector<HTMLElement>('[data-test~="selected-row"]')?.dataset.threadId;
  }

  isVisible(selector: string): boolean {
    const element = document.querySelector<HTMLElement>(selector);
    return element !== null && element.closest("[hidden]") === null;
  }

  composerText(): string {
    return document.querySelector('[data-test="composer"] .cm-content')?.textContent ?? "";
  }
}
