knaveE2E.scenario(async (driver) => {
  const e2e = knaveE2E;
  e2e.check("the first account is active", driver.text('[data-test~="status-account"]') === "ada@example.com", driver.text('[data-test~="status-account"]'));
  await e2e.step("<C-n>");
  e2e.check("ctrl-n switches to the next account", driver.text('[data-test~="status-account"]') === "grace@example.org", driver.text('[data-test~="status-account"]'));
  e2e.check("the next account has its own inbox", driver.count('[data-test~="thread-row"]') > 0, "empty inbox");
  await e2e.step("<C-p>");
  e2e.check("ctrl-p switches back", driver.text('[data-test~="status-account"]') === "ada@example.com", driver.text('[data-test~="status-account"]'));
});
