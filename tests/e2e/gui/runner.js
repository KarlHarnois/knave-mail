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
  async scenario(body) {
    window.addEventListener("load", async () => {
      try {
        const driver = await this.driver();
        await driver.whenIdle();
        await body(driver);
      } catch (error) {
        this.check("scenario ran", false, String(error));
      }
      this.finish();
    });
  },
};

