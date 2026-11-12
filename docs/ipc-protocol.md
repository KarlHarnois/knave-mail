# IPC protocol

The webview frontend and the knave core talk through JSON messages.

## Transport

- The frontend sends a request with `window.ipc.postMessage(json)`.
- The core answers by calling `window.knaveBridge.receive(message)`, where `message` is a parsed JSON object.
- The page is served from `knave://localhost/`: `index.html`, `app.js` and `app.css`.

## Messages

A request:

```json
{"id": 7, "command": "threads", "args": {"account": "ada@example.com", "label": "INBOX", "query": "", "limit": 100}}
```

A reply always carries the request's `id`, and either `ok` or `error`:

```json
{"id": 7, "ok": [ ... ]}
{"id": 7, "error": {"kind": "not-found", "message": "no thread t-9 in ada@example.com"}}
```

Error kinds are `usage`, `not-found`, `auth-required`, `network` and `internal`.

An event has no `id`, and the core sends it on its own:

```json
{"event": "synced", "account": "ada@example.com"}
{"event": "sync-failed", "account": "ada@example.com", "error": {"kind": "network", "message": "..."}}
```

## Types

```ts
type Account = { email: string };
type Label = { id: string; name: string; unread: number };
type ThreadSummary = {
  id: string; subject: string; participants: string; snippet: string;
  date: number;           // milliseconds since the Unix epoch
  unread: boolean; starred: boolean; labels: string[]; messageCount: number;
};
type Message = {
  id: string; threadId: string; from: string; to: string[]; cc: string[];
  subject: string; date: number; text: string; html: string | null;
};
type Thread = { id: string; subject: string; labels: string[]; messages: Message[] };
type Draft = {
  to: string[]; cc: string[]; subject: string; body: string;
  replyTo: string | null;  // id of the message being answered, or null
};
```

## Commands

| command | args | ok |
|---|---|---|
| `accounts` | `{}` | `Account[]` |
| `labels` | `{account}` | `Label[]` |
| `threads` | `{account, label, query, limit}` | `ThreadSummary[]`, newest first. An empty `query` lists the label. |
| `thread` | `{account, threadId}` | `Thread` |
| `reply-draft` | `{account, messageId, all}` | `Draft` with recipients, `Re:` subject and the quoted body filled in |
| `forward-draft` | `{account, messageId}` | `Draft` with `Fwd:` subject and the forwarded body |
| `send` | `{account, draft}` | `{}` |
| `archive`, `move-to-inbox`, `trash`, `untrash`, `star`, `unstar`, `mark-read`, `mark-unread` | `{account, threadIds}` | `{}` |
| `sync` | `{account}` | `{}`, then a `synced` or `sync-failed` event when it finishes |
