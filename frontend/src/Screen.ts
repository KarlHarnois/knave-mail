import type { Action, KeyMode } from "./KeyBindings";

export interface Screen {
  readonly element: HTMLElement;
  readonly keyMode: KeyMode | null;
  modeName(): string;
  capturesKeys(): boolean;
  pressCaptured(token: string): void;
  perform(action: Action, count: number | null): void;
  focus(): void;
}
