export type PaletteEntry = {
  readonly name: string;
  readonly keys: string;
  readonly takesArgument: boolean;
  readonly isCurrent?: boolean;
  readonly run: () => void;
};

export type PaletteRequest = {
  readonly prompt: string;
  readonly label: string;
  readonly mode: string;
  readonly takesArguments: boolean;
  readonly entries: readonly PaletteEntry[] | Promise<readonly PaletteEntry[]>;
  readonly runTyped: (text: string) => void;
  readonly reportLoadError?: (error: unknown) => void;
  readonly passKey?: (token: string) => void;
  readonly closed?: () => void;
};
