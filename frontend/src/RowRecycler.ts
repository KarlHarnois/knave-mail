import type { ListWindow, RowRange } from "./ListWindow";
import type { ThreadRowRenderer } from "./ThreadRowRenderer";

export class RowRecycler {
  private readonly rowsByIndex = new Map<number, HTMLElement>();
  private readonly spareRows: HTMLElement[] = [];

  constructor(
    private readonly container: HTMLElement,
    private readonly rows: ThreadRowRenderer,
    private readonly listWindow: ListWindow,
  ) {}

  rowAt(index: number): HTMLElement {
    return this.rowsByIndex.get(index) ?? this.attach(index);
  }

  recycleOutside(range: RowRange): void {
    for (const [index, row] of this.rowsByIndex) {
      if (index >= range.start && index < range.end) continue;
      row.remove();
      this.rowsByIndex.delete(index);
      this.spareRows.push(row);
    }
  }

  private attach(index: number): HTMLElement {
    const row = this.spareRows.pop() ?? this.rows.create();
    this.container.append(row);
    row.style.transform = `translateY(${this.listWindow.offsetOf(index)}px)`;
    this.rowsByIndex.set(index, row);
    return row;
  }
}
