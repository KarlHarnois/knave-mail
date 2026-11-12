knaveE2E.themeColor = (variable) => {
  const probe = document.createElement("span");
  probe.style.color = `var(${variable})`;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
};

knaveE2E.scenario(async (driver) => {
  const e2e = knaveE2E;
  const style = getComputedStyle(document.documentElement);
  e2e.check("the theme file sets the font size", style.getPropertyValue("--font-size").trim() === "17px", style.getPropertyValue("--font-size"));
  e2e.check("the theme file forces the dark mode", style.colorScheme === "dark", style.colorScheme);
  e2e.check("the message font falls back to the theme font", getComputedStyle(document.body).fontFamily.includes("Iosevka Aile"), getComputedStyle(document.body).fontFamily);
  e2e.check("the theme file overrides a dark color", style.getPropertyValue("--dark-accent").trim() === "#ff8800", style.getPropertyValue("--dark-accent"));
  const openedAt = performance.now();
  driver.press("<CR>");
  const frame = await e2e.waitFor('[data-test~="message-html"]');
  for (let waited = 0; waited < 3000 && frame?.style.visibility !== "visible"; waited += 5) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const shownAfter = Math.round(performance.now() - openedAt);
  e2e.report(`dark mail shown after ${shownAfter} ms`);
  e2e.check("dark mail shows without a noticeable delay", shownAfter < 250, `${shownAfter} ms`);
  const mailBody = frame?.contentDocument?.body;
  const mailBackground = mailBody ? getComputedStyle(mailBody).backgroundColor : "none";
  const channels = (mailBackground.match(/\d+/g) ?? ["255", "255", "255"]).slice(0, 3).map(Number);
  e2e.check("a light newsletter is darkened in a dark theme", channels.every((channel) => channel < 90), mailBackground);
  await driver.whenIdle();
  await e2e.step("qc");
  await e2e.step("Gohellojj");
  e2e.check("the keymap file maps jj to escape", driver.text('[data-test~="status-mode"]') === "COMPOSE NORMAL", driver.text('[data-test~="status-mode"]'));
  await e2e.step("qk");
  const panel = document.querySelector('[data-test~="composer"]:not([hidden]) .cm-panels');
  e2e.check("the vim panel takes the status bar color", panel !== null && getComputedStyle(panel).backgroundColor === e2e.themeColor("--status-bar"), panel && getComputedStyle(panel).backgroundColor);
  e2e.check("the vim panel text takes the foreground color", panel !== null && getComputedStyle(panel).color === e2e.themeColor("--foreground"), panel && getComputedStyle(panel).color);
  await e2e.step("q");
  const editor = document.querySelector('[data-test~="composer"]:not([hidden]) .cm-editor');
  const promptPanel = document.createElement("div");
  promptPanel.className = "cm-vim-panel";
  const input = document.createElement("input");
  promptPanel.append(input);
  editor?.append(promptPanel);
  e2e.check("the vim command input takes the foreground color", input !== null && getComputedStyle(input).color === e2e.themeColor("--foreground"), input && getComputedStyle(input).color);
  promptPanel.remove();
  const widthBefore = window.innerWidth;
  const statusBefore = document.querySelector('[data-test="status-line"]').getBoundingClientRect().bottom;
  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "-", ctrlKey: true, bubbles: true, cancelable: true }));
  await driver.whenIdle();
  await new Promise((resolve) => setTimeout(resolve, 300));
  e2e.check("ctrl and - zooms the whole page out", window.innerWidth > widthBefore, `${widthBefore} -> ${window.innerWidth}`);
  const statusBottom = document.querySelector('[data-test="status-line"]').getBoundingClientRect().bottom;
  e2e.check("the status line stays at the bottom when zoomed", Math.abs(statusBottom - window.innerHeight) < 2, `${statusBefore} -> ${statusBottom} of ${window.innerHeight}`);
});
