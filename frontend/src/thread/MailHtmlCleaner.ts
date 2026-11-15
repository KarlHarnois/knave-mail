type UnsafeRule = (element: Element) => boolean;
type UnsafeRules = Record<string, UnsafeRule>;

const PRELOADING_RELS = new Set(["prefetch", "dns-prefetch", "preconnect", "preload", "prerender", "modulepreload"]);
const MAX_CLEANING_PASSES = 5;

export class MailHtmlCleaner {
  private static readonly staticFrameRules: UnsafeRules = {
    meta: (meta) => meta.hasAttribute("http-equiv"),
    link: (link) => MailHtmlCleaner.preloads(link),
  };

  private static readonly scriptedFrameRules: UnsafeRules = {
    ...MailHtmlCleaner.staticFrameRules,
    noscript: () => true,
  };

  private constructor(
    private readonly rules: UnsafeRules,
    private readonly parser: DOMParser,
  ) {}

  static forStaticFrame(parser: DOMParser = new DOMParser()): MailHtmlCleaner {
    return new MailHtmlCleaner(MailHtmlCleaner.staticFrameRules, parser);
  }

  static forScriptedFrame(parser: DOMParser = new DOMParser()): MailHtmlCleaner {
    return new MailHtmlCleaner(MailHtmlCleaner.scriptedFrameRules, parser);
  }

  private static preloads(link: Element): boolean {
    const rels = (link.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    return rels.some((rel) => PRELOADING_RELS.has(rel));
  }

  clean(html: string): string {
    let cleaned = html;
    for (let pass = 0; pass < MAX_CLEANING_PASSES; pass++) {
      const next = this.removeUnsafeElements(cleaned);
      if (next === cleaned) return cleaned;
      cleaned = next;
    }
    return "";
  }

  private removeUnsafeElements(html: string): string {
    const body = this.parser.parseFromString(`<!doctype html><body>${html}`, "text/html").body;
    const unsafe = this.unsafeElementsIn(body);
    if (unsafe.length === 0) return html;
    for (const element of unsafe) element.remove();
    return body.innerHTML;
  }

  private unsafeElementsIn(body: HTMLElement): Element[] {
    const candidates = body.querySelectorAll(Object.keys(this.rules).join(", "));
    return [...candidates].filter((element) => this.rules[element.localName]?.(element) ?? false);
  }
}
