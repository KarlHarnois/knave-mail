import { beforeEach, describe, expect, test } from "bun:test";
import { StatusLine } from "../../src/status/StatusLine";

describe("StatusLine", () => {
  let status: StatusLine;

  beforeEach(() => {
    status = new StatusLine(document);
    document.body.replaceChildren(status.element);
  });

  test("shows mode, account, label and sync state", () => {
    status.showMode("LIST");
    status.showAccount("ada@example.com");
    status.showLabel("Inbox");
    status.showSync("syncing");
    expect(status.read("mode")).toBe("LIST");
    expect(status.read("account")).toBe("ada@example.com");
    expect(status.read("label")).toBe("Inbox");
    expect(status.read("sync")).toBe("syncing");
  });

  test("exposes each field through a data-test attribute", () => {
    status.showAccount("ada@example.com");
    expect(document.querySelector('[data-test="status-account"]')?.textContent).toBe("ada@example.com");
    expect(document.querySelector('[data-test="status-line"]')).toBe(status.element);
  });

  test("keeps the last error until it is cleared", () => {
    status.showError("first");
    status.showError("second");
    expect(status.read("error")).toBe("second");
    status.clearError();
    expect(status.read("error")).toBe("");
  });

  test("an error replaces the notice", () => {
    status.showNotice("sent");
    status.showError("send: network: offline");
    expect(status.read("notice")).toBe("");
  });

  test("a notice leaves the last error in place", () => {
    status.showError("boom");
    status.showNotice("draft kept");
    expect(status.read("error")).toBe("boom");
    expect(status.read("notice")).toBe("draft kept");
  });

  test("shows pending keys", () => {
    status.showPendingKeys("3g");
    expect(status.read("keys")).toBe("3g");
  });
});

describe("status messages", () => {
  test("an error clears itself after its lifetime", async () => {
    const status = new StatusLine(document, 20);
    status.showError("offline");
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(status.read("error")).toBe("");
  });

  test("a notice clears itself after its lifetime", async () => {
    const status = new StatusLine(document, 20);
    status.showNotice("archived 1 thread");
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(status.read("notice")).toBe("");
  });
});
