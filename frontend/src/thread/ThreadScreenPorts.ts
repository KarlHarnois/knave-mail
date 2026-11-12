import type { ScreenHost } from "../app/ScreenHost";
import type { MailClient } from "../bridge/MailClient";
import type { Draft, ThreadSummary } from "../bridge/Protocol";
import type { MailSession } from "../mail/MailSession";
import type { ThreadActions } from "../mail/ThreadActions";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { MessageCardServices } from "./MessageCard";

export type ThreadScreenPorts = {
  host: ScreenHost;
  mail: MailClient;
  session: MailSession;
  actions: ThreadActions;
  errors: ErrorReporter;
  cards: MessageCardServices;
  openDraft: (draft: Draft) => void;
  neighbourThread: (offset: number) => ThreadSummary | undefined;
};
