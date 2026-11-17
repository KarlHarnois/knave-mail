import { describe, expect, test } from "bun:test";
import { SyncMonitor, type SyncMonitorPorts } from "../../src/mail/SyncMonitor";

const ADA = "ada@example.com";
const GRACE = "grace@example.org";
const MINUTE = 60_000;

class SyncFixture {
  readonly synced: string[] = [];
  private repeated: () => void = () => {};
  repeatEvery = 0;
  private switchTo: (account: string) => void = () => {};
  time = 0;

  monitor(): SyncMonitor {
    const ports = {
      mail: {
        accounts: async () => [{ email: ADA }, { email: GRACE }],
        sync: async (account: string) => {
          this.synced.push(account);
        },
      },
      session: {
        hasAccount: true,
        account: ADA,
        onAccountChange: (listener: (account: string) => void) => {
          this.switchTo = listener;
        },
      },
      status: { showSync: () => {} },
      errors: { run: (work: Promise<void>) => work },
      repeat: (run: () => void, everyMilliseconds: number) => {
        this.repeated = run;
        this.repeatEvery = everyMilliseconds;
      },
      now: () => this.time,
    };
    return new SyncMonitor(ports as unknown as SyncMonitorPorts);
  }

  async started(): Promise<SyncMonitor> {
    const monitor = this.monitor();
    monitor.startSyncing();
    await Promise.resolve();
    return monitor;
  }

  async tick(): Promise<void> {
    this.repeated();
    await Promise.resolve();
  }

  switchAccount(account: string): void {
    this.switchTo(account);
  }
}

describe("sync monitor", () => {
  test("starting syncs every account", async () => {
    const fixture = new SyncFixture();
    await fixture.started();
    expect(fixture.synced).toEqual([ADA, GRACE]);
  });

  test("every account syncs again every five minutes", async () => {
    const fixture = new SyncFixture();
    await fixture.started();
    fixture.time = 5 * MINUTE;
    await fixture.tick();
    expect(fixture.repeatEvery).toBe(5 * MINUTE);
    expect(fixture.synced).toEqual([ADA, GRACE, ADA, GRACE]);
  });

  test("switching to an account last synced over a minute ago syncs it", async () => {
    const fixture = new SyncFixture();
    await fixture.started();
    fixture.time = MINUTE;
    fixture.switchAccount(GRACE);
    expect(fixture.synced).toEqual([ADA, GRACE, GRACE]);
  });

  test("switching to an account synced under a minute ago does not sync it", async () => {
    const fixture = new SyncFixture();
    await fixture.started();
    fixture.time = MINUTE - 1;
    fixture.switchAccount(GRACE);
    expect(fixture.synced).toEqual([ADA, GRACE]);
  });
});
