import { beforeEach, describe, expect, test } from "bun:test";
import { Bridge } from "../src/Bridge";
import { BridgeError } from "../src/BridgeError";
import type { CoreEvent } from "../src/Protocol";
import { FakeTransport } from "./support/FakeTransport";

describe("Bridge", () => {
  let transport: FakeTransport;
  let bridge: Bridge;

  beforeEach(() => {
    transport = new FakeTransport();
    bridge = new Bridge(transport);
  });

  test("sends a request with a numeric id, the command and its args", () => {
    void bridge.request("threads", { account: "ada@example.com", label: "INBOX", query: "", limit: 100 });
    expect(transport.lastRequest()).toEqual({
      id: 1,
      command: "threads",
      args: { account: "ada@example.com", label: "INBOX", query: "", limit: 100 },
    });
  });

  test("sends empty args when none are given", () => {
    void bridge.request("accounts");
    expect(transport.lastRequest().args).toEqual({});
  });

  test("gives every request a new id", () => {
    void bridge.request("accounts");
    void bridge.request("accounts");
    expect(transport.sent.map((request) => request.id)).toEqual([1, 2]);
  });

  test("resolves a request with the ok value of its reply", async () => {
    const reply = bridge.request("accounts");
    transport.reply(1, [{ email: "ada@example.com" }]);
    expect(await reply).toEqual([{ email: "ada@example.com" }]);
  });

  test("matches replies to requests by id, in any order", async () => {
    const first = bridge.request("labels", { account: "a" });
    const second = bridge.request("labels", { account: "b" });
    transport.reply(2, "second");
    transport.reply(1, "first");
    expect([await first, await second]).toEqual(["first", "second"]);
  });

  test("rejects a request with a BridgeError for an error reply", async () => {
    const reply = bridge.request("thread", { account: "a", threadId: "t-9" });
    transport.fail(1, { kind: "not-found", message: "no thread t-9 in a" });
    const error = await reply.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BridgeError);
    expect((error as BridgeError).kind).toBe("not-found");
    expect((error as BridgeError).describe()).toBe("thread: not-found: no thread t-9 in a");
  });

  test("tracks pending requests until they settle", () => {
    void bridge.request("accounts");
    void bridge.request("labels", { account: "a" }).catch(() => {});
    expect(bridge.pendingCount).toBe(2);
    transport.reply(1, []);
    transport.fail(2, { kind: "internal", message: "boom" });
    expect(bridge.pendingCount).toBe(0);
  });

  test("whenIdle resolves once every request has settled", async () => {
    void bridge.request("accounts");
    let idle = false;
    const waiting = bridge.whenIdle().then(() => {
      idle = true;
    });
    await Promise.resolve();
    expect(idle).toBe(false);
    transport.reply(1, []);
    await waiting;
    expect(idle).toBe(true);
  });

  test("whenIdle resolves at once with nothing pending", async () => {
    await bridge.whenIdle();
    expect(bridge.pendingCount).toBe(0);
  });

  test("ignores replies to unknown ids", () => {
    void bridge.request("accounts");
    transport.reply(99, []);
    expect(bridge.pendingCount).toBe(1);
  });

  test("ignores malformed messages", () => {
    transport.deliver(null);
    transport.deliver("text");
    transport.deliver({ nothing: true });
    expect(bridge.pendingCount).toBe(0);
  });

  test("dispatches events to every subscriber", () => {
    const seen: CoreEvent[] = [];
    bridge.subscribe((event) => seen.push(event));
    bridge.subscribe((event) => seen.push(event));
    transport.emit({ event: "synced", account: "ada@example.com" });
    expect(seen).toEqual([
      { event: "synced", account: "ada@example.com" },
      { event: "synced", account: "ada@example.com" },
    ]);
  });

  test("stops dispatching to a subscriber after it unsubscribes", () => {
    const seen: CoreEvent[] = [];
    const unsubscribe = bridge.subscribe((event) => seen.push(event));
    unsubscribe();
    transport.emit({ event: "sync-failed", account: "a", error: { kind: "network", message: "offline" } });
    expect(seen).toEqual([]);
  });

  test("an event does not settle a pending request", () => {
    void bridge.request("sync", { account: "a" });
    transport.emit({ event: "synced", account: "a" });
    expect(bridge.pendingCount).toBe(1);
  });

  test("a transport failure rejects the request and leaves nothing pending", async () => {
    const failing = new Bridge({
      send: () => {
        throw new Error("window.ipc is missing");
      },
      onReceive: () => {},
    });
    await expect(failing.request("accounts")).rejects.toThrow("window.ipc is missing");
    expect(failing.pendingCount).toBe(0);
  });
});
