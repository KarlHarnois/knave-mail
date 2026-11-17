import type { Bridge } from "./Bridge";
import type {
  Account,
  ArchivedOlder,
  Draft,
  Label,
  Thread,
  ThreadCommand,
  ThreadPage,
  ThreadSummary,
} from "./Protocol";

export type ThreadQuery = { account: string; label: string; query: string; limit: number };

export class MailClient {
  constructor(private readonly bridge: Bridge) {}

  accounts(): Promise<Account[]> {
    return this.bridge.request("accounts");
  }

  labels(account: string): Promise<Label[]> {
    return this.bridge.request("labels", { account });
  }

  threads(query: ThreadQuery): Promise<ThreadSummary[]> {
    return this.bridge.request("threads", query);
  }

  threadPage(query: ThreadQuery, pageToken: string): Promise<ThreadPage> {
    return this.bridge.request("thread-page", { ...query, pageToken });
  }

  thread(account: string, threadId: string): Promise<Thread> {
    return this.bridge.request("thread", { account, threadId });
  }

  replyDraft(account: string, messageId: string, all: boolean): Promise<Draft> {
    return this.bridge.request("reply-draft", { account, messageId, all });
  }

  forwardDraft(account: string, messageId: string): Promise<Draft> {
    return this.bridge.request("forward-draft", { account, messageId });
  }

  async send(account: string, draft: Draft): Promise<void> {
    await this.bridge.request("send", { account, draft });
  }

  async modify(command: ThreadCommand, account: string, threadIds: string[]): Promise<void> {
    await this.bridge.request(command, { account, threadIds });
  }

  archiveOlder(account: string, before: string): Promise<ArchivedOlder> {
    return this.bridge.request("archive-older", { account, before });
  }

  async zoom(level: number): Promise<void> {
    await this.bridge.request("zoom", { level });
  }

  async sync(account: string): Promise<void> {
    await this.bridge.request("sync", { account });
  }
}
