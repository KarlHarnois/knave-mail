import { describe, expect, test } from "bun:test";
import { DarkReaderWarmup } from "../../src/darkmail/DarkReaderWarmup";
import type { MailColorSource } from "../../src/darkmail/MailDarkening";
import { HtmlSandbox } from "../../src/thread/HtmlSandbox";
import type { MailFontSource } from "../../src/thread/MailFont";
import { MessageFrame } from "../../src/thread/MessageFrame";
import { MessageLinks } from "../../src/thread/MessageLinks";

const sandbox = new HtmlSandbox();
const CSP_META = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/;

class PolicyReader {
  static of(srcdoc: string): string {
    return CSP_META.exec(srcdoc)?.[1] ?? "";
  }

  static directive(policy: string, name: string): string {
    return policy.split("; ").find((directive) => directive.startsWith(`${name} `)) ?? "";
  }
}

class FrameDocument {
  static of(srcdoc: string): Document {
    return new DOMParser().parseFromString(srcdoc, "text/html");
  }

  static mailMetaCount(srcdoc: string): number {
    const metas = [...FrameDocument.of(srcdoc).querySelectorAll("meta[http-equiv]")];
    return metas.filter((meta) => meta.getAttribute("http-equiv") !== "Content-Security-Policy").length;
  }

  static count(srcdoc: string, selector: string): number {
    return FrameDocument.of(srcdoc).querySelectorAll(selector).length;
  }
}

describe("HtmlSandbox.srcdoc", () => {
  test("puts the CSP meta in the head before the message", () => {
    const srcdoc = sandbox.srcdoc("<p>Hello</p>", false);
    expect(srcdoc.indexOf("Content-Security-Policy")).toBeLessThan(srcdoc.indexOf("<p>Hello</p>"));
    expect(srcdoc.indexOf("Content-Security-Policy")).toBeLessThan(srcdoc.indexOf("</head>"));
  });

  test("blocks scripts and everything not allowed explicitly", () => {
    const policy = PolicyReader.of(sandbox.srcdoc("", false));
    expect(PolicyReader.directive(policy, "default-src")).toBe("default-src 'none'");
    expect(PolicyReader.directive(policy, "script-src")).toBe("script-src 'none'");
  });

  test("blocks remote images by default", () => {
    const images = PolicyReader.directive(PolicyReader.of(sandbox.srcdoc("", false)), "img-src");
    expect(images).toBe("img-src data: cid:");
  });

  test("allows remote images when asked", () => {
    const images = PolicyReader.directive(PolicyReader.of(sandbox.srcdoc("", true)), "img-src");
    expect(images).toBe("img-src data: cid: https: http:");
  });

  test("blocks remote fonts either way", () => {
    for (const remoteImages of [false, true]) {
      const fonts = PolicyReader.directive(PolicyReader.of(sandbox.srcdoc("", remoteImages)), "font-src");
      expect(fonts).toBe("font-src data:");
    }
  });

  test("keeps the message HTML in the body", () => {
    expect(sandbox.srcdoc("<table><tr><td>cell</td></tr></table>", false)).toContain(
      "<body><table><tr><td>cell</td></tr></table></body>",
    );
  });
});

describe("navigation from mail HTML", () => {
  const refresh = '<META HTTP-EQUIV="Refresh" CONTENT="0;url=data:text/html,<script>alert(1)</script>">';

  test("a meta refresh in darkened mail is removed", () => {
    const srcdoc = sandbox.srcdoc(`<p>Hi</p>${refresh}`, false, DARK.colors());
    expect(FrameDocument.mailMetaCount(srcdoc)).toBe(0);
    expect(FrameDocument.of(srcdoc).body.textContent).toBe("Hi");
  });

  test("a meta refresh in light mail is removed", () => {
    expect(FrameDocument.mailMetaCount(sandbox.srcdoc(refresh, false))).toBe(0);
  });

  test("a quoted > before http-equiv does not hide the meta", () => {
    const hidden = '<meta content="a>b" http-equiv=refresh>';
    expect(FrameDocument.mailMetaCount(sandbox.srcdoc(hidden, false, DARK.colors()))).toBe(0);
  });

  test("a meta hidden in noscript markup cannot appear when scripts run", () => {
    const smuggled =
      '<noscript><p title="</noscript><meta http-equiv=refresh content=0;url=https://evil.test>"></noscript>';
    expect(sandbox.srcdoc(smuggled, false, DARK.colors())).not.toContain("http-equiv=refresh");
  });

  test("preloading links are removed", () => {
    const rels = ["prefetch", "dns-prefetch", "preconnect", "preload"];
    const links = rels.map((rel) => `<link rel="${rel.toUpperCase()}" href="https://tracker.test/">`).join("");
    expect(FrameDocument.count(sandbox.srcdoc(`${links}<p>Hi</p>`, false), "link")).toBe(0);
  });

  test("the policy blocks forms and base URL changes", () => {
    const policy = PolicyReader.of(sandbox.srcdoc("", false, DARK.colors()));
    expect(PolicyReader.directive(policy, "form-action")).toBe("form-action 'none'");
    expect(PolicyReader.directive(policy, "base-uri")).toBe("base-uri 'none'");
  });
});

const LIGHT: MailColorSource = { colors: () => null };
const links = new MessageLinks({ openLink: () => {} });
const DARK: MailColorSource = { colors: () => ({ background: "rgb(18, 18, 18)", foreground: "rgb(190, 190, 190)" }) };

describe("dark mail", () => {
  test("a dark theme lets only the Dark Reader script run, by nonce", () => {
    const darkSandbox = new HtmlSandbox(() => "n0nce");
    const policy = PolicyReader.directive(PolicyReader.of(darkSandbox.srcdoc("", false, DARK.colors())), "script-src");
    expect(policy).toBe("script-src 'nonce-n0nce' knave://localhost/darkreader.js");
  });

  test("a dark theme starts Dark Reader with the theme colors", () => {
    const srcdoc = new HtmlSandbox(() => "n0nce").srcdoc("<p>Hi</p>", false, DARK.colors());
    expect(srcdoc).toContain(
      '<script nonce="n0nce">window.knaveDarkReader.start("rgb(18, 18, 18)","rgb(190, 190, 190)")</script>',
    );
  });

  test("every message gets a fresh nonce", () => {
    const first = sandbox.srcdoc("", false, DARK.colors());
    const second = sandbox.srcdoc("", false, DARK.colors());
    expect(PolicyReader.directive(PolicyReader.of(first), "script-src")).not.toBe(
      PolicyReader.directive(PolicyReader.of(second), "script-src"),
    );
  });

  test("a light theme keeps every script blocked", () => {
    expect(PolicyReader.directive(PolicyReader.of(sandbox.srcdoc("", false, LIGHT.colors())), "script-src")).toBe(
      "script-src 'none'",
    );
  });

  test("a darkened frame may run scripts and stays hidden until it has loaded", () => {
    const frame = new MessageFrame({ document, sandbox, links, darkening: DARK, html: "<p>Hi</p>" });
    expect(frame.element.getAttribute("sandbox")).toBe("allow-same-origin allow-scripts");
    expect(frame.element.style.visibility).toBe("hidden");
  });
});

describe("Dark Reader warm-up", () => {
  test("loads Dark Reader once in a hidden frame when the theme is dark", () => {
    document.body.replaceChildren();
    new DarkReaderWarmup(document, sandbox, DARK).start();
    const frame = document.querySelector("iframe");
    expect(frame?.hidden).toBe(true);
    expect(frame?.srcdoc).toContain("knave://localhost/darkreader.js");
  });

  test("does nothing when the theme is light", () => {
    document.body.replaceChildren();
    new DarkReaderWarmup(document, sandbox, LIGHT).start();
    expect(document.querySelector("iframe")).toBeNull();
  });
});

describe("MessageFrame", () => {
  test("is a sandboxed iframe without scripts that cannot take keyboard focus", () => {
    const frame = new MessageFrame({ document, sandbox, links, darkening: LIGHT, html: "<p>Hi</p>" });
    expect(frame.element.getAttribute("sandbox")).toBe("allow-same-origin");
    expect(frame.element.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(frame.element.tabIndex).toBe(-1);
  });

  test("loads the message with remote images blocked", () => {
    const frame = new MessageFrame({ document, sandbox, links, darkening: LIGHT, html: "<p>Hi</p>" });
    expect(frame.allowsRemoteImages).toBe(false);
    expect(frame.element.srcdoc).toContain("img-src data: cid:;");
  });

  test("reloads the message with remote images allowed", () => {
    const frame = new MessageFrame({ document, sandbox, links, darkening: LIGHT, html: "<p>Hi</p>" });
    frame.allowRemoteImages();
    expect(frame.allowsRemoteImages).toBe(true);
    expect(frame.element.srcdoc).toContain("img-src data: cid: https: http:");
    expect(frame.element.srcdoc).toContain("<p>Hi</p>");
  });
});

const IOSEVKA: MailFontSource = { font: () => ({ family: '"IosevkaTerm Nerd Font Mono", monospace', size: "15px" }) };

describe("mail font", () => {
  test("html mail defaults to the theme's message font and size", () => {
    const srcdoc = new HtmlSandbox(undefined, IOSEVKA).srcdoc("<p>Hi</p>", false);
    expect(srcdoc).toContain('body{font-family:"IosevkaTerm Nerd Font Mono", monospace;font-size:15px}');
  });

  test("the theme's font replaces the fonts a message names", () => {
    const srcdoc = new HtmlSandbox(undefined, IOSEVKA).srcdoc('<p style="font-family:Cambria,serif">Hi</p>', false);
    expect(srcdoc).toContain('{font-family:"IosevkaTerm Nerd Font Mono", monospace!important}');
  });

  test("code keeps its own monospace font", () => {
    const srcdoc = new HtmlSandbox(undefined, IOSEVKA).srcdoc("<pre>x</pre>", false);
    expect(srcdoc).toContain("body :not(pre, code, kbd, samp, tt, pre *, code *){font-family:");
  });

  test("a font name cannot close the style or add rules", () => {
    const hostile: MailFontSource = { font: () => ({ family: "x}</style><script>alert(1)</script>", size: "15px" }) };
    const srcdoc = new HtmlSandbox(undefined, hostile).srcdoc("", false);
    expect(srcdoc).not.toContain("<script>alert");
    expect(srcdoc.match(/<\/style>/g)).toHaveLength(1);
  });

  test("without a theme font html mail uses the system font", () => {
    expect(sandbox.srcdoc("", false)).toContain("body{font-family:system-ui, sans-serif;font-size:14px}");
  });
});
