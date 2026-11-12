import { enable, setFetchMethod } from "darkreader";

type DarkMailWindow = Window & { knaveDarkReader?: { start(background: string, foreground: string): void } };

(window as DarkMailWindow).knaveDarkReader = {
  start(background: string, foreground: string): void {
    setFetchMethod(window.fetch);
    enable({
      mode: 1,
      brightness: 100,
      contrast: 100,
      sepia: 0,
      darkSchemeBackgroundColor: background,
      darkSchemeTextColor: foreground,
    });
  },
};
