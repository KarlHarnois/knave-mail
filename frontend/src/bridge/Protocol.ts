export type Account = { email: string };

export type Label = { id: string; name: string; unread: number };

export type ThreadSummary = {
  id: string;
  subject: string;
  participants: string;
  snippet: string;
  date: number;
  unread: boolean;
  starred: boolean;
  labels: string[];
  messageCount: number;
};

export type Message = {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  date: number;
  text: string;
  html: string | null;
};

export type Thread = { id: string; subject: string; labels: string[]; messages: Message[] };

export type Draft = {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  replyTo: string | null;
};

export type ErrorKind = "usage" | "not-found" | "auth-required" | "network" | "internal";

export type CoreError = { kind: ErrorKind; message: string };

export type Request = { id: number; command: string; args: Record<string, unknown> };

export type Reply = { id: number; ok: unknown } | { id: number; error: CoreError };

export type ThreadPage = { threads: ThreadSummary[]; nextPageToken: string };

export type SyncedEvent = { event: "synced"; account: string };

export type SyncFailedEvent = { event: "sync-failed"; account: string; error: CoreError };

export type SyncProgressEvent = { event: "sync-progress"; account: string };

export type CoreEvent = SyncedEvent | SyncProgressEvent | SyncFailedEvent;

export type ThreadCommand =
  | "archive"
  | "move-to-inbox"
  | "trash"
  | "untrash"
  | "star"
  | "unstar"
  | "mark-read"
  | "mark-unread";
