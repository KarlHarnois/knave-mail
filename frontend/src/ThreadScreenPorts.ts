import type { ErrorReporter } from "./ErrorReporter";
import type { MailClient } from "./MailClient";
import type { MailSession } from "./MailSession";
import type { MessageCardServices } from "./MessageCard";
import type { Draft, ThreadSummary } from "./Protocol";
import type { ScreenHost } from "./ScreenHost";
import type { ThreadActions } from "./ThreadActions";

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
