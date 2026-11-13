window.knaveE2E = {
  failures: 0,
  report(line) {
    window.ipc.postMessage(JSON.stringify({ command: "e2e-report", args: { line } }));
  },
  check(name, passed, detail) {
    if (!passed) this.failures += 1;
    this.report(`${passed ? "ok" : "FAIL"} ${name}${passed ? "" : ` (${detail})`}`);
  },
  finish() {
    window.ipc.postMessage(JSON.stringify({ command: "e2e-finish", args: { passed: this.failures === 0 } }));
  },
  async driver() {
    while (!window.knaveTestDriver) await new Promise((resolve) => setTimeout(resolve, 20));
    return window.knaveTestDriver;
  },
  async step(keys) {
    const driver = await this.driver();
    driver.press(keys);
    await driver.whenIdle();
    return driver;
  },
  selected(driver) {
    return driver.text('[data-test~="selected-row"]');
  },
  async waitFor(selector) {
    for (let waited = 0; waited < 2000 && !document.querySelector(selector); waited += 20) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return document.querySelector(selector);
  },
  async whenListed(driver) {
    for (let waited = 0; waited < 10000 && driver.count('[data-test~="selected-row"]') === 0; waited += 20) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await driver.whenIdle();
  },
  async whenWindowSettled() {
    const size = () => `${window.innerWidth}x${window.innerHeight}`;
    let last = size();
    let stableFor = 0;
    for (let waited = 0; waited < 10000 && stableFor < 1000; waited += 50) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      stableFor = size() === last ? stableFor + 50 : 0;
      last = size();
    }
  },
  async whenSynced(driver) {
    const finished = () => /^(synced|sync failed)/.test(driver.text('[data-test="status-sync"]'));
    for (let waited = 0; waited < 20000 && !finished(); waited += 20) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await driver.whenIdle();
  },
  async scenario(body) {
    if (window.top !== window) return;
    window.addEventListener("load", async () => {
      const startedBefore = sessionStorage.getItem("knave-e2e-started");
      sessionStorage.setItem("knave-e2e-started", "yes");
      if (startedBefore) {
        this.report("the page loaded again, so this scenario copy stays idle");
        return;
      }
      try {
        await this.whenWindowSettled();
        const driver = await this.driver();
        await this.whenListed(driver);
        await this.whenSynced(driver);
        const firstRows = [...document.querySelectorAll('[data-test~="thread-row"]')].slice(0, 3).map((row) => row.getAttribute("data-thread-id"));
        this.report(`first rows: ${firstRows.join(", ")}; selected: ${document.querySelector('[data-test~="selected-row"]')?.getAttribute("data-thread-id")}`);
        await body(driver);
      } catch (error) {
        this.check("scenario ran", false, String(error));
      }
      this.finish();
    });
  },
};

