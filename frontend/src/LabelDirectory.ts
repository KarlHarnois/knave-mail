import type { MailClient } from "./MailClient";
import type { Label } from "./Protocol";

export type LabelRef = { id: string; name: string };

export const INBOX: LabelRef = { id: "INBOX", name: "Inbox" };
export const ALL_MAIL: LabelRef = { id: "ALL", name: "All Mail" };

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

  forget(account: string): void {
    this.labelsByAccount.delete(account);
  }

  private async labelsOf(account: string): Promise<Label[]> {
    const cached = this.labelsByAccount.get(account);
    if (cached) return cached;
    const labels = await this.mail.labels(account);
    this.labelsByAccount.set(account, labels);
    return labels;
  }

  private matches(label: Label, wanted: string): boolean {
    return label.id.toLowerCase() === wanted || label.name.toLowerCase() === wanted;
  }

  private isAllMail(wanted: string): boolean {
    return wanted === ALL_MAIL.id.toLowerCase() || wanted === ALL_MAIL.name.toLowerCase();
  }
}
