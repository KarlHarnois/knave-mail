import type { MailClient } from "../bridge/MailClient";
import type { Draft } from "../bridge/Protocol";
import type { MailSession } from "../mail/MailSession";
import type { ErrorReporter } from "../status/ErrorReporter";
import type { StatusLine } from "../status/StatusLine";

export type DraftSenderPorts = {
  mail: MailClient;
  session: MailSession;
  errors: ErrorReporter;
  status: StatusLine;
};

export class DraftSender {
  private isSending = false;

  constructor(private readonly ports: DraftSenderPorts) {}

  send(draft: Draft, onSent: () => void): void {
    if (this.isSending) this.ports.status.showNotice("still sending");
    else if (draft.to.length === 0) this.ports.status.showError("send: add at least one address on the To: line");
    else this.startSending(draft, onSent);
  }

  private startSending(draft: Draft, onSent: () => void): void {
    this.isSending = true;
    const sent = this.ports.mail
      .send(this.ports.session.account, draft)
      .finally(() => {
        this.isSending = false;
      })
      .then(onSent);
    this.ports.errors.run(sent);
  }
}
