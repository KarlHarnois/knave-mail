const NOT_FOUND = -1;

export class MatchMarks {
  show(cells: readonly Element[], query: string): void {
    for (const cell of cells) cell.replaceChildren(...this.segments(cell, query));
  }

  private segments(cell: Element, query: string): Node[] {
    const text = cell.textContent ?? "";
    const lowered = text.toLowerCase();
    const nodes: Node[] = [];
    let start = 0;
    for (let at = this.find(lowered, query, 0); at !== NOT_FOUND; at = this.find(lowered, query, start)) {
      const end = at + query.length;
      nodes.push(cell.ownerDocument.createTextNode(text.slice(start, at)), this.mark(cell, text.slice(at, end)));
      start = end;
    }
    nodes.push(cell.ownerDocument.createTextNode(text.slice(start)));
    return nodes;
  }

  private find(text: string, query: string, from: number): number {
    return query === "" ? NOT_FOUND : text.indexOf(query, from);
  }

  private mark(cell: Element, text: string): HTMLElement {
    const mark = cell.ownerDocument.createElement("mark");
    mark.className = "list-match";
    mark.textContent = text;
    return mark;
  }
}
