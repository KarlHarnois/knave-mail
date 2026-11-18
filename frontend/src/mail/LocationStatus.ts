import type { ThreadList } from "../list/ThreadList";
import type { StatusLine } from "../status/StatusLine";
import type { LabelRef } from "./LabelDirectory";

export type LocationStatusPorts = { list: ThreadList; status: StatusLine };

export class LocationStatus {
  constructor(private readonly ports: LocationStatusPorts) {}

  showWhere(account: string, label: LabelRef, query: string): void {
    this.ports.status.showAccount(account);
    this.ports.status.showLabel(query ? `${label.name} /${query}` : label.name);
  }

  showCount(label: LabelRef, total: number): void {
    const shown = this.ports.list.length;
    this.ports.status.showLabel(total > shown ? `${label.name} ${shown} of ${total}` : label.name);
  }
}
