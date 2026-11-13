import type { Transport } from "../bridge/Transport";

export type LogLevel = "error" | "warn" | "info" | "debug";

export class Logger {
  constructor(private readonly transport: Transport) {}

  error(message: string): void {
    this.write("error", message);
  }

  warn(message: string): void {
    this.write("warn", message);
  }

  info(message: string): void {
    this.write("info", message);
  }

  private write(level: LogLevel, message: string): void {
    this.transport.send(JSON.stringify({ command: "log", args: { level, message } }));
  }
}
