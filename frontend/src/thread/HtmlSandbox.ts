import type { MailColors } from "../darkmail/MailDarkening";
import { type MailFontSource, SYSTEM_MAIL_FONT } from "./MailFont";
import { MailHtmlCleaner } from "./MailHtmlCleaner";

const BLOCKED_IMAGE_SOURCES = "data: cid:";
const ALLOWED_IMAGE_SOURCES = "data: cid: https: http:";
const ISOLATED_FLAGS = "allow-same-origin";
const DARKENED_FLAGS = "allow-same-origin allow-scripts";
const DARK_READER_URL = "knave://localhost/darkreader.js";
const BASE_STYLE = [
  "html{color-scheme:light;background:#fff;color:#111}",
  "body{margin:0;padding:12px 16px;overflow-wrap:anywhere}",
  "img{max-width:100%;height:auto}",
  "pre{white-space:pre-wrap}",
].join("");

export class HtmlSandbox {
  private readonly staticFrameCleaner = MailHtmlCleaner.forStaticFrame();
  private readonly scriptedFrameCleaner = MailHtmlCleaner.forScriptedFrame();

  constructor(
    private readonly newNonce: () => string = () => crypto.randomUUID().replaceAll("-", ""),
    private readonly fonts: MailFontSource = SYSTEM_MAIL_FONT,
  ) {}

  sandboxFlagsFor(darkening: MailColors | null): string {
    return darkening ? DARKENED_FLAGS : ISOLATED_FLAGS;
  }

  policy(remoteImages: boolean, nonce: string | null = null): string {
    const imageSources = remoteImages ? ALLOWED_IMAGE_SOURCES : BLOCKED_IMAGE_SOURCES;
    return [
      "default-src 'none'",
      nonce ? `script-src 'nonce-${nonce}' ${DARK_READER_URL}` : "script-src 'none'",
      "style-src 'unsafe-inline'",
      `img-src ${imageSources}`,
      "font-src data:",
      "media-src 'none'",
      "frame-src 'none'",
      "form-action 'none'",
      "base-uri 'none'",
    ].join("; ");
  }

  srcdoc(html: string, remoteImages: boolean, darkening: MailColors | null = null): string {
    const nonce = darkening ? this.newNonce() : null;
    const head = [
      '<meta charset="utf-8">',
      `<meta http-equiv="Content-Security-Policy" content="${this.policy(remoteImages, nonce)}">`,
      `<style>${BASE_STYLE}${this.fontStyle()}</style>`,
      darkening && nonce ? this.darkReaderScripts(darkening, nonce) : "",
    ].join("");
    const body = this.cleanerFor(darkening).clean(html);
    return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
  }

  private cleanerFor(darkening: MailColors | null): MailHtmlCleaner {
    return darkening ? this.scriptedFrameCleaner : this.staticFrameCleaner;
  }

  private fontStyle(): string {
    const { family, size } = this.fonts.font();
    return `body{font-family:${this.cssSafe(family)};font-size:${this.cssSafe(size)}}`;
  }

  private cssSafe(value: string): string {
    return value.replace(/[<>{};]/g, "");
  }

  private darkReaderScripts(darkening: MailColors, nonce: string): string {
    const colors = `${JSON.stringify(darkening.background)},${JSON.stringify(darkening.foreground)}`;
    return [
      `<script nonce="${nonce}" src="${DARK_READER_URL}"></script>`,
      `<script nonce="${nonce}">window.knaveDarkReader.start(${colors})</script>`,
    ].join("");
  }
}
