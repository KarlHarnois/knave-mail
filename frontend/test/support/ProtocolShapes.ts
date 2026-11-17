import type {
  Account,
  CoreError,
  CoreEvent,
  Draft,
  Label,
  Message,
  Thread,
  ThreadPage,
  ThreadSummary,
} from "../../src/bridge/Protocol";
import { ListOf, type ShapeOf } from "./JsonShape";

export type EventShapes = { readonly [Event in CoreEvent as Event["event"]]: ShapeOf<Event> };

export class ProtocolShapes {
  static readonly account: ShapeOf<Account> = { email: "string" };

  static readonly label: ShapeOf<Label> = { id: "string", name: "string", unread: "number", total: "number" };

  static readonly threadSummary: ShapeOf<ThreadSummary> = {
    id: "string",
    subject: "string",
    participants: "string",
    snippet: "string",
    date: "number",
    unread: "boolean",
    starred: "boolean",
    labels: "strings",
    messageCount: "number",
  };

  static readonly message: ShapeOf<Message> = {
    id: "string",
    threadId: "string",
    from: "string",
    to: "strings",
    cc: "strings",
    subject: "string",
    date: "number",
    text: "string",
    html: "nullable string",
  };

  static readonly thread: ShapeOf<Thread> = {
    id: "string",
    subject: "string",
    labels: "strings",
    messages: new ListOf(ProtocolShapes.message),
  };

  static readonly threadPage: ShapeOf<ThreadPage> = {
    threads: new ListOf(ProtocolShapes.threadSummary),
    nextPageToken: "string",
  };

  static readonly draft: ShapeOf<Draft> = {
    to: "strings",
    cc: "strings",
    subject: "string",
    body: "string",
    replyTo: "nullable string",
  };

  static readonly coreError: ShapeOf<CoreError> = { kind: "error kind", message: "string" };

  static readonly events: EventShapes = {
    synced: { event: "string", account: "string" },
    "sync-progress": { event: "string", account: "string" },
    "sync-failed": { event: "string", account: "string", error: ProtocolShapes.coreError },
    queue: { event: "string", account: "string", waiting: "number" },
    "operation-failed": {
      event: "string",
      account: "string",
      name: "string",
      threadIds: "strings",
      error: ProtocolShapes.coreError,
    },
  };
}
