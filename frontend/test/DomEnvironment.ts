import { GlobalRegistrator } from "@happy-dom/global-registrator";

class DomEnvironment {
  static install(): void {
    GlobalRegistrator.register({ url: "knave://localhost/" });
    DomEnvironment.dropSelectionChangesThatReenterCodeMirror();
  }

  private static dropSelectionChangesThatReenterCodeMirror(): void {
    const dispatch = document.dispatchEvent.bind(document);
    document.dispatchEvent = (event: Event) => event.type === "selectionchange" || dispatch(event);
  }
}

DomEnvironment.install();
