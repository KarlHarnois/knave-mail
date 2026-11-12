knaveE2E.scenario(async () => {
  const e2e = knaveE2E;
  const style = getComputedStyle(document.documentElement);
  e2e.check("the theme file sets the font size", style.getPropertyValue("--font-size").trim() === "17px", style.getPropertyValue("--font-size"));
  e2e.check("the theme file forces the dark mode", style.colorScheme === "dark", style.colorScheme);
  e2e.check("the message font falls back to the theme font", style.getPropertyValue("--theme-font").includes("Iosevka Aile") && getComputedStyle(document.body).fontFamily.includes("Iosevka Aile"), getComputedStyle(document.body).fontFamily);
  e2e.check("the theme file overrides a dark color", style.getPropertyValue("--dark-accent").trim() === "#ff8800", style.getPropertyValue("--dark-accent"));
  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "=", ctrlKey: true, bubbles: true, cancelable: true }));
  e2e.check("ctrl and = zooms the window in", document.documentElement.style.getPropertyValue("zoom") === "1.1", document.documentElement.style.getPropertyValue("zoom"));
});
