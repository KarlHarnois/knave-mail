import type { ErrorReporter } from "./ErrorReporter";
import type { MailClient } from "./MailClient";
import type { MailSession } from "./MailSession";
import type { MessageCard } from "./MessageCard";
import type { Draft } from "./Protocol";

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
