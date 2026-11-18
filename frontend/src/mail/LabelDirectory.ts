import type { MailClient } from "../bridge/MailClient";
import type { Label } from "../bridge/Protocol";

export type LabelRef = { id: string; name: string };

export const INBOX: LabelRef = { id: "INBOX", name: "Inbox" };
export const ALL_MAIL: LabelRef = { id: "ALL", name: "All Mail" };
export const SENT: LabelRef = { id: "SENT", name: "Sent" };
export const SPAM: LabelRef = { id: "SPAM", name: "Spam" };
export const TRASH: LabelRef = { id: "TRASH", name: "Trash" };

const READABLE_SYSTEM_NAMES = new Map([INBOX, SENT, SPAM, TRASH].map((label) => [label.id, label.name]));

export class LabelDirectory {
  private readonly labelsByAccount = new Map<string, Label[]>();

  constructor(private readonly mail: MailClient) {}

  async find(account: string, name: string): Promise<LabelRef> {
    const wanted = name.toLowerCase();
    if (this.isAllMail(wanted)) return ALL_MAIL;
    const labels = await this.labelsOf(account);
    const label = labels.find((candidate) => this.matches(candidate, wanted));
    if (!label) throw new Error(`no label named ${name} in ${account}`);
    return { id: label.id, name: label.name };
  }

  async all(account: string): Promise<Label[]> {
    return await this.labelsOf(account);
  }

  forget(account: string): void {
    this.labelsByAccount.delete(account);
  }

  private async labelsOf(account: string): Promise<Label[]> {
    const cached = this.labelsByAccount.get(account);
    if (cached) return cached;
    const labels = (await this.mail.labels(account)).map((label) => this.readable(label));
    this.labelsByAccount.set(account, labels);
    return labels;
  }

  private readable(label: Label): Label {
    return { ...label, name: READABLE_SYSTEM_NAMES.get(label.id) ?? label.name };
  }

  private matches(label: Label, wanted: string): boolean {
    return label.id.toLowerCase() === wanted || label.name.toLowerCase() === wanted;
  }

  private isAllMail(wanted: string): boolean {
    return wanted === ALL_MAIL.id.toLowerCase() || wanted === ALL_MAIL.name.toLowerCase();
  }
}
