const NOT_FOUND = -1;

export class MatchMarks {
  show(cells: readonly Element[], query: string): void {
    for (const cell of cells) cell.replaceChildren(...this.segments(cell, query));
  }

  private segments(cell: Element, query: string): Node[] {
    const text = cell.textContent ?? "";
    const nodes: Node[] = [];
    let start = 0;
    for (let at = this.find(text, query, 0); at !== NOT_FOUND; at = this.find(text, query, start)) {
      const end = at + query.length;
      nodes.push(cell.ownerDocument.createTextNode(text.slice(start, at)), this.mark(cell, text.slice(at, end)));
      start = end;
    }
    nodes.push(cell.ownerDocument.createTextNode(text.slice(start)));
    return nodes;
  }

  private find(text: string, query: string, from: number): number {
    if (query === "") return NOT_FOUND;
    for (let at = from; at + query.length <= text.length; at++) {
      if (text.slice(at, at + query.length).toLowerCase() === query) return at;
    }
    return NOT_FOUND;
  }

  private mark(cell: Element, text: string): HTMLElement {
    const mark = cell.ownerDocument.createElement("mark");
    mark.className = "list-match";
    mark.textContent = text;
    return mark;
  }
}
