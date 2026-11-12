import type { Screen } from "./Screen";

export interface ScreenHost {
  push(screen: Screen): void;
  back(): void;
  refreshStatus(): void;
}
