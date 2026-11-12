knaveE2E.scenario(async (driver) => {
  const e2e = knaveE2E;
  await e2e.step("/invoice<CR>");
  e2e.check("a search lists matching threads", driver.count('[data-test~="thread-row"]') > 0 && e2e.selected(driver).includes("invoice"), e2e.selected(driver));
  await e2e.step(":q<CR>");
  const selectedOffset = document.querySelector('[data-test~="selected-row"]')?.style.transform;
  e2e.check(":q clears the search back to the top of the inbox", driver.text('[data-test~="status-label"]') === "Inbox" && selectedOffset === "translateY(0px)", `${driver.text('[data-test~="status-label"]')} ${selectedOffset}`);
  await e2e.step("gl");
  e2e.check("gl opens the label picker", driver.count('[data-test="label-picker"]:not([hidden])') === 1, driver.text('[data-test~="status-mode"]'));
  await e2e.step("/rec<CR><CR>");
  e2e.check("the picker opens the chosen label", driver.text('[data-test~="status-label"]') === "Receipts", driver.text('[data-test~="status-label"]'));
});
