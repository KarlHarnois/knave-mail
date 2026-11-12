import type { Label } from "../bridge/Protocol";
import { ALL_MAIL, INBOX, type LabelRef } from "../mail/LabelDirectory";

export type LabelChoice = { label: LabelRef; unread: number | null };

const FIRST_LABELS: readonly LabelRef[] = [INBOX, ALL_MAIL];

export class LabelChoices {
  from(labels: readonly Label[]): LabelChoice[] {
    const unreadById = new Map(labels.map((label) => [label.id, label.unread]));
    const first = FIRST_LABELS.map((label) => ({ label, unread: unreadById.get(label.id) ?? null }));
    const rest = labels
      .filter((label) => !FIRST_LABELS.some((firstLabel) => firstLabel.id === label.id))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((label) => ({ label: { id: label.id, name: label.name }, unread: label.unread }));
    return [...first, ...rest];
  }
}
