knaveE2E.scenario(async (driver) => {
  const e2e = knaveE2E;
  await e2e.step("/invoice<CR>");
  e2e.check("a search lists matching threads", driver.count('[data-test~="thread-row"]') > 0 && e2e.selected(driver).includes("invoice"), e2e.selected(driver));
  await e2e.step(":q<CR>");
  e2e.check(":q clears the search", e2e.selected(driver).includes("Weekly"), e2e.selected(driver));
});
