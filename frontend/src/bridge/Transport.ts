export interface Transport {
  send(json: string): void;
  onReceive(handler: (message: unknown) => void): void;
}
