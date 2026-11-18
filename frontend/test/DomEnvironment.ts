import { GlobalRegistrator } from "@happy-dom/global-registrator";

const DESIGN_TOKENS = { "--component-list-item-height": "30px" };

class DomEnvironment {
  static install(): void {
    GlobalRegistrator.register({ url: "knave://localhost/" });
    DomEnvironment.dropSelectionChangesThatReenterCodeMirror();
    DomEnvironment.defineDesignTokens();
  }

  private static defineDesignTokens(): void {
    for (const [property, value] of Object.entries(DESIGN_TOKENS)) {
      document.documentElement.style.setProperty(property, value);
    }
  }

  private static dropSelectionChangesThatReenterCodeMirror(): void {
    const dispatch = document.dispatchEvent.bind(document);
    document.dispatchEvent = (event: Event) => event.type === "selectionchange" || dispatch(event);
  }
}

DomEnvironment.install();
