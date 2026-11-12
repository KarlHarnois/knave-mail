knaveE2E.scenario(async (driver) => {
  const e2e = knaveE2E;
  e2e.check("the inbox lists threads", driver.count('[data-test~="thread-row"]') > 0, "no rows");
  await e2e.step("jjk");
  e2e.check("j and k move the cursor", e2e.selected(driver).includes("Unicode"), e2e.selected(driver));
  await e2e.step("G");
  e2e.check("G jumps to the last thread", !e2e.selected(driver).includes("Weekly"), e2e.selected(driver));
  await e2e.step("gg");
  e2e.check("gg jumps to the first thread", e2e.selected(driver).includes("Weekly"), e2e.selected(driver));
  await e2e.step("3j");
  e2e.check("a count repeats a motion", e2e.selected(driver).includes("Edsger"), e2e.selected(driver));
});
