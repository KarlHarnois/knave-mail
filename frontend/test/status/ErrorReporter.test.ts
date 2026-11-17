import { beforeEach, describe, expect, test } from "bun:test";
import { BridgeError } from "../../src/bridge/BridgeError";
import { Logger } from "../../src/logging/Logger";
import { ErrorReporter } from "../../src/status/ErrorReporter";
import { StatusLine } from "../../src/status/StatusLine";
import { RecordedCore } from "../support/RecordedCore";

describe("ErrorReporter", () => {
  let status: StatusLine;
  let core: RecordedCore;
  let reporter: ErrorReporter;

  beforeEach(() => {
    status = new StatusLine(document);
    document.body.replaceChildren(status.element);
    core = new RecordedCore(undefined);
    reporter = new ErrorReporter(status, new Logger(core));
  });

  test("shows a failure as an error and logs a warning", () => {
    reporter.report(new BridgeError("thread", { kind: "network", message: "offline" }));
    expect(status.read("error")).toBe("thread: network: offline");
    expect(core.sent).toEqual([{ command: "log", args: { level: "warn", message: "thread: network: offline" } }]);
  });

  test("shows Gmail's rate limit as a notice instead of an error", () => {
    reporter.report(new BridgeError("thread-page", { kind: "throttled", message: "Gmail is rate limiting" }));
    expect(status.read("error")).toBe("");
    expect(status.read("notice")).toBe("Gmail is rate limiting this account; try again in a minute");
  });

  test("logs Gmail's rate limit at the info level", () => {
    reporter.report(new BridgeError("thread-page", { kind: "throttled", message: "Gmail is rate limiting" }));
    expect(core.sent).toEqual([
      { command: "log", args: { level: "info", message: "thread-page: throttled: Gmail is rate limiting" } },
    ]);
  });
});
