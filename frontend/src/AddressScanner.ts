export class AddressScanner {
  private readonly finished: string[] = [];
  private current = "";
  private quoted = false;
  private angleDepth = 0;

  read(character: string): void {
    this.track(character);
    if (this.separates(character)) this.finishAddress();
    else this.current += character;
  }

  addresses(): string[] {
    return [...this.finished, this.current].map((address) => address.trim());
  }

  private track(character: string): void {
    if (character === '"') this.quoted = !this.quoted;
    if (this.quoted) return;
    if (character === "<") this.angleDepth++;
    if (character === ">") this.angleDepth = Math.max(0, this.angleDepth - 1);
  }

  private separates(character: string): boolean {
    return character === "," && !this.quoted && this.angleDepth === 0;
  }

  private finishAddress(): void {
    this.finished.push(this.current);
    this.current = "";
  }
}
