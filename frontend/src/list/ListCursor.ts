export class ListCursor {
  private position = 0;
  private total = 0;
  private anchor: number | null = null;

  get index(): number {
    return this.position;
  }

  get length(): number {
    return this.total;
  }

  get isSelecting(): boolean {
    return this.anchor !== null;
  }

  get selectionStart(): number {
    return Math.min(this.anchor ?? this.position, this.position);
  }

  get selectionEnd(): number {
    return Math.max(this.anchor ?? this.position, this.position);
  }

  startSelection(): void {
    this.anchor = this.position;
  }

  endSelection(): void {
    this.anchor = null;
  }

  isChosen(index: number): boolean {
    return index >= this.selectionStart && index <= this.selectionEnd;
  }

  resize(total: number): void {
    this.total = Math.max(0, total);
    if (this.anchor !== null) this.anchor = Math.min(this.anchor, Math.max(0, this.total - 1));
    this.moveTo(this.position);
  }

  moveBy(delta: number): void {
    this.moveTo(this.position + delta);
  }

  moveTo(index: number): void {
    const lastIndex = Math.max(0, this.total - 1);
    this.position = Math.min(Math.max(0, index), lastIndex);
  }

  moveToFirst(): void {
    this.moveTo(0);
  }

  moveToLast(): void {
    this.moveTo(this.total - 1);
  }
}
