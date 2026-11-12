import { describe, expect, test } from "bun:test";
import { HtmlSandbox } from "../src/HtmlSandbox";
import { MessageFrame } from "../src/MessageFrame";

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
    expect(sandbox.srcdoc('<table><tr><td>cell</td></tr></table>', false)).toContain(
      "<body><table><tr><td>cell</td></tr></table></body>",
    );
  });
});

describe("MessageFrame", () => {
  test("is a sandboxed iframe without scripts that cannot take keyboard focus", () => {
    const frame = new MessageFrame(document, sandbox, "<p>Hi</p>");
    expect(frame.element.getAttribute("sandbox")).toBe("allow-same-origin");
    expect(frame.element.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(frame.element.tabIndex).toBe(-1);
  });

  test("loads the message with remote images blocked", () => {
    const frame = new MessageFrame(document, sandbox, "<p>Hi</p>");
    expect(frame.allowsRemoteImages).toBe(false);
    expect(frame.element.srcdoc).toContain("img-src data: cid:;");
  });

  test("reloads the message with remote images allowed", () => {
    const frame = new MessageFrame(document, sandbox, "<p>Hi</p>");
    frame.allowRemoteImages();
    expect(frame.allowsRemoteImages).toBe(true);
    expect(frame.element.srcdoc).toContain("img-src data: cid: https: http:");
    expect(frame.element.srcdoc).toContain("<p>Hi</p>");
  });
});
