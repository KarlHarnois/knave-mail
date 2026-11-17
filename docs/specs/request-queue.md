# Spec: Gmail operation queue

## Problem

Archiving 50 or more threads at once fails partway, and the archived threads come back on screen. The debug log of 2026-11-17 shows why:

- **Sync and label changes compete for one quota.** Each account has one Gmail quota of about 250 units per second. At launch, one account's sync found 852 changed threads and downloaded each one in full, about 1,700 calls over 5 minutes. The archives ran at the same time.
- **A rate limit on a POST fails at once.** `get-with-retries` in `gmail/http.knv` retries a GET up to 6 times. `post-one!` in `gmail/session.knv` never retries, yet `gmail/replies.knv` reports "still reached after retrying".
- **One failure fails the whole batch.** `relabel-each!` in `app/writing.knv` stops at the first failed thread. The window reloads, and every thread after the failure, never archived, reappears.
- **Sync can undo a local change.** If sync downloads a thread before you archive it, it saves that copy, still in the Inbox, after the archive reached the cache.
- **Sync downloads threads whose labels alone changed.** `sync-changes!` in `app/sync/changes.knv` refreshes every thread the history names, though most entries only add or remove labels.
- **Retry, pacing and logging are scattered.** Each call site decides on its own whether to retry, and nothing records which call waited, retried or failed.

## Goals

- Every Gmail call is an operation. One queue owns retries, quota, priority, ordering and logging for all of them.
- A label change the window accepted reaches Gmail, despite rate limits, network outages and restarts.
- A label change shows in the window at once and stays shown.
- Your own actions run before background sync.
- A change Gmail refuses for good is reverted and reported once.

## Non-goals

- Durable sending. Sends are operations, but stay in memory, because a message going out after you closed the window needs its own design. Durability is one policy flag, so this can change later.
- Offline reading beyond what the cache holds.
- Merging an archive and its undo while both are still queued.

## Design

### 1. Operation model

An operation is plain data, so it can cross threads and be stored in sqlite:

```clojure
(defstruct relabel-work
  :thread thread-ref
  :change label-change)

(defenum operation-kind
  (relabel relabel-work)
  (send outgoing)
  (fetch-thread thread-ref)
  (fetch-summaries summaries-request)
  (fetch-history history-request)
  (fetch-page page-request)
  (fetch-labels string))

(defenum priority interactive background)

(defstruct operation
  :id i64
  :account string
  :kind operation-kind
  :priority priority
  :attempts i64
  :not-before i64)
```

- `relabel-work` carries the label ids added and removed, not a command name, so custom labels work too.
- `interactive` is for window reads and your actions. `background` is for sync.

### 2. Policy

One pure table in `domain/` gives each kind its rules:

```clojure
(defstruct operation-policy
  :name string
  :durable bool
  :units u32
  :most-attempts (option i64)
  :order-key (option string))
```

| Kind | Name | Durable | Units | Most attempts | Order key |
|---|---|---|---|---|---|
| `relabel` | relabel | yes, from step 5 | 10 | 6, unlimited once durable | the thread |
| `send` | send | no | 100 | 1, retried only when `throttled` | none |
| `fetch-thread` | fetch thread | no | 10 | 3 | none |
| `fetch-summaries` | fetch summaries | no | 10 per thread | 3 | none |
| `fetch-threads` | fetch threads | no | 10 per thread | 3 | none |
| `fetch-thread-ids` | fetch thread ids | no | 5 | 3 | none |
| `fetch-history` | fetch history | no | 2 | 3 | none |
| `fetch-history-id` | fetch history id | no | 1 | 3 | none |
| `fetch-page` | fetch page | no | 5 | 3 | none |
| `fetch-labels` | fetch labels | no | 1 per label | 3 | none |

- Reads stop after 3 attempts, so being offline fails within seconds instead of a minute.
- A send never retries a network error, because the message may already have gone out. It retries only a `throttled` reply, which Gmail gives before doing anything.

After each attempt, a pure function picks the next step:

```clojure
(defenum next-step finished (retry-at i64) (give-up mail-error))
```

- **Retryable failures:** `throttled` and `network`. A durable operation also keeps waiting on `auth-required`, because signing in again fixes it.
- **Final failures:** `not-found`, `usage` and `internal`, or a retryable failure once `most-attempts` runs out.
- **Backoff:** the `Retry-After` delay when Gmail sends one, or the time after "Retry after" in Gmail's error message. Otherwise it doubles from 1 second, up to 60 seconds.
- **Long waits:** when Gmail asks for a wait longer than 60 seconds, an operation that isn't durable stops at once with the throttled error. A durable operation waits.

### 3. Performing

`perform!` in `app/` is the only code that calls the `mailbox` port. It is one `match` on the kind, returning one result type:

```clojure
(defenum operation-result
  relabeled
  (thread-fetched thread)
  (summaries-fetched (vec thread-summary))
  (history-fetched mail-changes)
  (page-fetched thread-page)
  (labels-fetched (vec label))
  (delivered string))
```

Callers unwrap the result they expect with small helpers such as `awaited-thread`.

### 4. Queue port and executor

A new driven port lets the app hand work over without knowing where it runs:

```clojure
(deftrait operation-queue
  (submit! (fn ((ref self) operation)
             (result operation-result mail-error)))
  (enqueue! (fn ((ref self) (vec operation))
              (result unit mail-error))))
```

- `submit!` waits for the result. `enqueue!` returns at once and is for durable work.
- **The threaded queue** is for the window. One executor thread owns the only Gmail sessions in the process. The window and sync threads send it operations over a channel. `submit!` blocks on a reply channel.
- **The inline queue** is for the CLI, the memory backend and tests. It runs the same executor loop on the caller's thread.
- **Executor loop:**
  1. Take the next ready operation. Interactive operations go before background ones. Older operations go first, and an operation waits while an earlier one with the same order key is queued.
  2. Run `perform!`.
  3. Apply the next step: answer the waiter, schedule a retry, or give up.
- **Logging:** the executor logs every step of every operation, as section 5 describes.
- `mail-app` replaces `:mailboxes` with `:operations (box operation-queue)`. App helpers keep their current shape, for example `(fetched-thread! app account thread-id priority)`, so the sync and reading code changes little.

### 5. Logging

- Every step of an operation's life writes one line under the area `operations`. The same shape is used for every kind:

  ```
  <level> operations #<id> <name> <account>: <step>[, <details>]
  ```

- `app/operation-log.knv` holds one function per step. All of them build the line with one shared formatter, so no call site formats its own text.
- `activity-log`'s `log-relabel!` goes away, because the `queued` line replaces it.

| Step | Level | Details |
|---|---|---|
| queued | debug | priority, and the kind's target: thread id and labels for a relabel, history id for a history fetch |
| batch queued | info | how many operations of which name, for example "queued 59 relabel" |
| recovered | info | the attempt it resumes at, for durable operations loaded at start |
| started | debug | attempt number out of the most attempts, time spent waiting since it was queued |
| finished | debug | how long the attempt took, the attempt number, total time since it was queued |
| throttled | info | Gmail's message, the next attempt number and the delay, and whether Gmail asked for that delay |
| failed, will retry | info | the error kind and message, the next attempt number and the delay |
| failed | info | the error kind and message, and the attempt, when the failure is not worth retrying, such as an expired history the caller handles |
| gave up | warn | the error kind and message, the attempts made, and "local change reverted" for a durable operation |

Example lines for one relabel:

```
DEBUG operations #42 relabel ada@example.com: queued, interactive, thread t-42 +[] -[INBOX]
DEBUG operations #42 relabel ada@example.com: started, attempt 1 of unlimited, waited 120ms
INFO  operations #42 relabel ada@example.com: throttled: Gmail is rate limiting this account: User-rate limit exceeded. Retry after 2026-11-17T16:05:12.123Z; attempt 2 in 4000ms, as Gmail asked
INFO  operations #42 relabel ada@example.com: failed, will retry: network: connection reset; attempt 3 in 8000ms
DEBUG operations #42 relabel ada@example.com: finished in 280ms, attempt 3, 12400ms since queued
WARN  operations #43 relabel ada@example.com: gave up after 1 attempt: not-found: Gmail has no such item; local change reverted
```

- **Privacy.** A line never holds tokens, subjects, addresses, snippets or bodies. A send logs only its operation id, account and outcome. An error message from Gmail goes in as Gmail sent it, and Gmail's error bodies hold no mail content.
- **One trail per operation.** Every line of an operation shares its `#id`, so `grep '#42 '` shows its whole history across retries and restarts.

### 6. Quota

- The Gmail session holds a token bucket in quota units: 200 units per second, with a capacity of 200. That leaves 20% under Gmail's per-user limit.
- Only the executor thread holds sessions, so the bucket needs no locks.
- `api-call!` serves GET and POST alike. It waits for the call's units before sending.
- A 429 or a `rateLimitExceeded` reply empties the bucket and returns a new `(throttled i64)` error carrying the delay. The queue decides whether to retry, so the adapter no longer sleeps and retries on its own.
- `http-get-all` keeps its parallel chunks, taking units for each request.

### 7. Durable operations

- **Accepting a change.** The window answers a label command itself. One store transaction applies the change to the cached summaries and threads and inserts one `queued_relabels` row per thread, then the window wakes the delivery thread and sends a `queue` event with the account's count.
- **Table:** `queued_relabels (id INTEGER PRIMARY KEY AUTOINCREMENT, account TEXT, thread_id TEXT, added TEXT, removed TEXT)`, with the label ids as JSON arrays.
- **Methods on `store`:** `queue-relabels!`, `load-queued`, `forget-queued!`, `revert-queued!` and `queued-count`. They go on `store` because the cached change and the row share one transaction, and because splitting the trait is blocked by the supertrait limitation.
- **Delivery.** The app delivers the oldest queued row as a relabel carrying the row's id, which makes it durable: unlimited attempts, and an expired sign-in is retried too.
  - On success the row is forgotten.
  - On a final failure the change is reverted and the row forgotten in one transaction, and the window gets an `operation-failed` event.
  - On a failure worth retrying the row stays queued.
- **Where it runs.** The executor stays generic and knows nothing of the store.
  - **Window:** a delivery thread with its own app delivers the rows one at a time through the executor, in order, so a later change to a thread never overtakes an earlier one. It starts by delivering what an earlier run left.
  - **CLI and memory backend:** they deliver right away on their own thread. Their inline queue has a patience limit, a minute for the CLI and none for the memory backend, after which a change is left queued.

### 8. Sync

- **Label-only history changes skip the download.**
  - `fetch-changes!` splits the history into `:refetch` and `:relabels`. `:refetch` holds threads with messages added or deleted. `:relabels` holds label changes per message.
  - A thread is settled from history alone when its changes add labels, or remove a label from every one of its messages, and no label was both added and removed in the batch. A settled thread is relabeled in the cache. Every other thread is downloaded.
  - A relabel for a thread the cache does not hold is ignored.
- **Sync can't undo a queued change.** The sqlite store's `save-thread!` and `save-threads!` re-apply the queued relabels for those threads in the same transaction. The cache then always equals Gmail's state plus what is still queued.
- **Sync runs at `background` priority.** It yields whenever you act.

### 9. Window

- `operation-failed` reloads the list and shows one error, for example "Gmail refused to archive 2 threads: not found".
- A `queue` event carries each account's count of queued durable operations. The status line shows "3 changes waiting" while it is above zero.
- `PendingChanges` now only covers the milliseconds before a relabel request answers. It is removed if the tests show it is no longer needed.

### 10. CLI

The CLI uses the inline queue. It writes durable rows like the window and delivers them for up to a minute. When changes are still waiting, it exits with code 4 and says "N label changes still wait for Gmail; the window sends them when it next opens".

## Delivery

Each step ships alone and helps by itself:

1. **History:** label-only changes skip the download.
2. **Operation model, the inline runner and operation logging.** Every mailbox call in `app/` goes through `perform!` with policy retries, on the caller's thread. POSTs get retries, and every step of every call writes an `operations` line. The `operation-queue` port and priorities wait for step 4, where the threaded queue is their second implementation.
3. **Quota:** the bucket in the Gmail session and the `throttled` error. Until step 4 each thread still has its own sessions, so each bucket runs at 100 units per second. Step 4 raises the one shared bucket to 200.
4. **Executor thread:** the threaded queue, with priorities. The window and sync submit to it. Each app carries its priority: the window and its request worker are `interactive`, and sync threads are `background`. The CLI and the memory backend use the inline queue.
5. **Durable relabels:** rows, recovery, giving up, the store overlay and `operation-failed`.
6. **Window:** the waiting count and the error message.
7. **CLI:** the drain with a deadline.

## Tests

- **Domain:** each kind's policy, `next-step-after` for each failure kind and attempt count, backoff and `Retry-After`, and the history-settled rule.
- **Operation log,** with a memory log: the exact line for each step in the table; a throttled relabel writes queued, started, throttled, started and finished lines under one `#id`; no line of a send holds its subject or recipients.
- **App,** with a fake mailbox that throttles the first N calls:
  - 60 archives all reach the mailbox;
  - a `not-found` reverts the cache and reports the thread;
  - an archive then an undo on one thread run in order;
  - interactive operations run before queued background ones;
  - a history with only whole-thread label changes downloads nothing.
- **Store contract,** for memory and sqlite: queuing applies the local effect; postpone, forget and revert; saving a thread keeps its queued relabels; the leftover rows load after a reopen.
- **Gmail integration,** against the fake server: a 429 on `modify` becomes `throttled` with the `Retry-After` delay; the bucket paces a burst; history parses into `:refetch` and `:relabels`.
- **Frontend:** `operation-failed` reloads and shows the error; the waiting count shows and clears.
- **GUI scenario:** archive 60 threads with the memory backend set to throttle. Every row stays gone.

## Open questions

- Should the waiting count show for the account that isn't on screen?
- Should a durable operation stop retrying after a day and be reported?
- Should a queued archive and its undo cancel each other, like `cancel()` on an `NSOperation`?
