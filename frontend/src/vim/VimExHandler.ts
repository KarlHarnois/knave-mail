export interface VimExHandler {
  write(): void;
  writeAndQuit(): void;
  quit(force: boolean): void;
}
