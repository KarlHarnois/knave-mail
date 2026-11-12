import type { Transport } from "./Transport";

type IpcWindow = {
  ipc?: { postMessage(json: string): void };
  knaveBridge?: { receive(message: unknown): void };
};

export class IpcTransport implements Transport {
  constructor(private readonly host: IpcWindow) {}

  send(json: string): void {
    if (!this.host.ipc) throw new Error("window.ipc is missing: the page is not running inside knave-mail");
    this.host.ipc.postMessage(json);
  }

  onReceive(handler: (message: unknown) => void): void {
    this.host.knaveBridge = { receive: handler };
  }
}
