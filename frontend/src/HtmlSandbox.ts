const BLOCKED_IMAGE_SOURCES = "data: cid:";
const ALLOWED_IMAGE_SOURCES = "data: cid: https: http:";
const SANDBOX_FLAGS = "allow-same-origin";
const BASE_STYLE = [
  "html{color-scheme:light;background:#fff;color:#111}",
  "body{margin:0;padding:12px 16px;font-family:system-ui,sans-serif;overflow-wrap:anywhere}",
  "img{max-width:100%;height:auto}",
  "pre{white-space:pre-wrap}",
].join("");

export class HtmlSandbox {
  readonly sandboxFlags = SANDBOX_FLAGS;

  policy(remoteImages: boolean): string {
    const imageSources = remoteImages ? ALLOWED_IMAGE_SOURCES : BLOCKED_IMAGE_SOURCES;
    return [
      "default-src 'none'",
      "script-src 'none'",
      "style-src 'unsafe-inline'",
      `img-src ${imageSources}`,
      "font-src data:",
      "media-src 'none'",
      "frame-src 'none'",
      "form-action 'none'",
      "base-uri 'none'",
    ].join("; ");
  }

  srcdoc(html: string, remoteImages: boolean): string {
    const head = [
      '<meta charset="utf-8">',
      `<meta http-equiv="Content-Security-Policy" content="${this.policy(remoteImages)}">`,
      `<style>${BASE_STYLE}</style>`,
    ].join("");
    return `<!doctype html><html><head>${head}</head><body>${html}</body></html>`;
  }
}
