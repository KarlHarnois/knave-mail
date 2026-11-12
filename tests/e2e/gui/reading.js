knaveE2E.scenario(async (driver) => {
  const e2e = knaveE2E;
  await e2e.step("<CR>");
  e2e.check("enter opens the thread", driver.text('[data-test~="thread-subject"]').includes("compilers"), driver.text('[data-test~="thread-subject"]'));
  e2e.check("html mail renders in the sandbox", driver.count('[data-test~="message-html"]') === 1, "no html frame");
  const frame = document.querySelector('[data-test~="message-html"] iframe, iframe[data-test~="message-html"]');
  e2e.check("the sandbox blocks scripts", frame !== null && !String(frame.getAttribute("sandbox")).includes("allow-scripts"), frame && frame.getAttribute("sandbox"));
  e2e.check("the sandbox blocks remote images", frame !== null && String(frame.srcdoc).includes("img-src data:"), "no csp");
  await e2e.step("q");
  e2e.check("q goes back to the list", driver.count('[data-test~="thread-list"]:not([hidden])') === 1, "no list");
  const beforeMove = e2e.selected(driver).slice(0, 40);
  await e2e.step("j");
  const afterMove = e2e.selected(driver).slice(0, 40);
  await e2e.step("<CR>");
  e2e.check("unicode text renders", driver.text('[data-test~="thread-view"]').includes("こんにちは"), `${beforeMove} -> ${afterMove} | ${driver.text('[data-test~="thread-view"]').slice(0, 60)}`);
});
