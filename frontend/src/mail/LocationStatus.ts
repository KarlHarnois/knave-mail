import type { ThreadList } from "../list/ThreadList";
import type { StatusLine } from "../status/StatusLine";
import type { LabelDirectory, LabelRef } from "./LabelDirectory";

export type LocationStatusPorts = { labels: LabelDirectory; list: ThreadList; status: StatusLine };

export class LocationStatus {
  constructor(private readonly ports: LocationStatusPorts) {}

  showWhere(account: string, label: LabelRef, query: string): void {
    this.ports.status.showAccount(account);
    this.ports.status.showLabel(query ? `${label.name} /${query}` : label.name);
  }

  async showCount(account: string, label: LabelRef, query: string): Promise<void> {
    if (query) return;
    const total = await this.totalInGmail(account, label).catch(() => 0);
    const shown = this.ports.list.length;
    this.ports.status.showLabel(total > shown ? `${label.name} ${shown} of ${total}` : label.name);
  }

  private async totalInGmail(account: string, label: LabelRef): Promise<number> {
    const labels = await this.ports.labels.all(account);
    return labels.find((candidate) => candidate.id === label.id)?.total ?? 0;
  }
}
