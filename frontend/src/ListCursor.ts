export class ListCursor {
  private position = 0;
  private total = 0;

  get index(): number {
    return this.position;
  }

  get length(): number {
    return this.total;
  }

  resize(total: number): void {
    this.total = Math.max(0, total);
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
