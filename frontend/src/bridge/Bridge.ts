import { BridgeError } from "./BridgeError";
import type { CoreError, CoreEvent } from "./Protocol";
import type { Transport } from "./Transport";

type PendingRequest = {
  command: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type IncomingMessage = { id?: unknown; ok?: unknown; error?: CoreError; event?: unknown };

export type EventListener = (event: CoreEvent) => void;

export class Bridge {
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly listeners = new Set<EventListener>();
  private idleWaiters: Array<() => void> = [];

  constructor(private readonly transport: Transport) {
    transport.onReceive((message) => this.receive(message));
  }

  request<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { command, resolve: resolve as (value: unknown) => void, reject });
      this.sendOrForget(id, JSON.stringify({ id, command, args }));
    });
  }

  notify(command: string, args: Record<string, unknown>): void {
    this.transport.send(JSON.stringify({ command, args }));
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  whenIdle(): Promise<void> {
    if (this.pending.size === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private sendOrForget(id: number, json: string): void {
    try {
      this.transport.send(json);
    } catch (error) {
      this.pending.delete(id);
      this.notifyIdleWaiters();
      throw error;
    }
  }

  private receive(message: unknown): void {
    if (!this.isObject(message)) return;
    if (typeof message.id === "number") this.settle(message.id, message);
    else if (typeof message.event === "string") this.dispatch(message as CoreEvent);
  }

  private settle(id: number, reply: IncomingMessage): void {
    const request = this.pending.get(id);
    if (!request) return;
    this.pending.delete(id);
    if (reply.error) request.reject(new BridgeError(request.command, reply.error));
    else request.resolve(reply.ok);
    this.notifyIdleWaiters();
  }

  private dispatch(event: CoreEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private notifyIdleWaiters(): void {
    if (this.pending.size > 0) return;
    const waiters = this.idleWaiters;
    this.idleWaiters = [];
    for (const wake of waiters) wake();
  }

  private isObject(message: unknown): message is IncomingMessage {
    return typeof message === "object" && message !== null;
  }
}
