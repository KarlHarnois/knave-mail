import type { MailClient } from "../bridge/MailClient";
import type { StatusLine } from "../status/StatusLine";
import type { MailSession } from "./MailSession";

export type OlderMailArchiverPorts = { mail: MailClient; session: MailSession; status: StatusLine };

export class OlderMailArchiver {
  constructor(private readonly ports: OlderMailArchiverPorts) {}

  async archive(before: string): Promise<void> {
    this.ports.status.showNotice(`archiving inbox threads older than ${before}…`);
    const { archived } = await this.ports.mail.archiveOlder(this.ports.session.account, before);
    this.ports.status.showNotice(`archived ${archived} inbox threads older than ${before}`);
    await this.ports.session.reload();
  }
}
