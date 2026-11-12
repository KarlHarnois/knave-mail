import type { MailClient } from "../bridge/MailClient";
import type { Draft } from "../bridge/Protocol";
import type { MailSession } from "../mail/MailSession";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { MessageCard } from "./MessageCard";

export type MessageRepliesPorts = {
  mail: MailClient;
  session: MailSession;
  errors: ErrorReporter;
  openDraft: (draft: Draft) => void;
};

export class MessageReplies {
  constructor(private readonly ports: MessageRepliesPorts) {}

  reply(card: MessageCard): void {
    this.draft(this.ports.mail.replyDraft(this.ports.session.account, card.message.id, false));
  }

  replyAll(card: MessageCard): void {
    this.draft(this.ports.mail.replyDraft(this.ports.session.account, card.message.id, true));
  }

  forward(card: MessageCard): void {
    this.draft(this.ports.mail.forwardDraft(this.ports.session.account, card.message.id));
  }

  private draft(request: Promise<Draft>): void {
    this.ports.errors.run(request.then((draft) => this.ports.openDraft(draft)));
  }
}
