knaveE2E.scenario(async (driver) => {
  const e2e = knaveE2E;
  const first = e2e.selected(driver);
  e2e.check("the triage starts on a listed thread", first !== "", driver.text('[data-test~="status-line"]'));
  const before = driver.count('[data-test~="thread-row"]');
  await e2e.step("e");
  e2e.check("e archives the selected thread", !e2e.selected(driver).includes(first.slice(0, 20)) || driver.count('[data-test~="thread-row"]') < before, `${e2e.selected(driver)} | ${driver.text('[data-test~="status-line"]')}`);
  const next = e2e.selected(driver);
  await e2e.step("#");
  e2e.check("# trashes the selected thread", e2e.selected(driver) !== next, e2e.selected(driver));
  await e2e.step("gi");
  e2e.check("archived threads stay out of the inbox after a reload", !driver.text('[data-test~="thread-list"]').includes("This week in compilers"), "newsletter still listed");
  const starredBefore = e2e.selected(driver).includes("★");
  await e2e.step("s");
  e2e.check("s toggles the star of the selected thread", e2e.selected(driver).includes("★") !== starredBefore, e2e.selected(driver));
});
