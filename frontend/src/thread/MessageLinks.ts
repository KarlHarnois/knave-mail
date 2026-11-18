export type LinkOpener = { openLink(url: string): void };

const WEB_PROTOCOLS = new Set(["http:", "https:"]);
const LINK_SELECTOR = "a[href]";

export class MessageLinks {
  constructor(private readonly opener: LinkOpener) {}

  follow(mail: Document): void {
    mail.addEventListener("click", (event) => this.openClicked(event), true);
    mail.addEventListener("auxclick", (event) => this.openClicked(event), true);
  }

  private openClicked(event: Event): void {
    const anchor = this.anchorAt(event.target);
    if (!anchor) return;
    event.preventDefault();
    if (this.isWebLink(anchor)) this.opener.openLink(anchor.href);
  }

  private anchorAt(target: EventTarget | null): HTMLAnchorElement | null {
    const element = target as Partial<Element> | null;
    return (element?.closest?.(LINK_SELECTOR) as HTMLAnchorElement | null) ?? null;
  }

  private isWebLink(anchor: HTMLAnchorElement): boolean {
    return WEB_PROTOCOLS.has(anchor.protocol);
  }
}
