import { KeyNotation } from "../keys/KeyNotation";

const WORD_BEFORE_CURSOR = /\S*\s*$/;

export class LineEditor {
  private value = "";
  private position = 0;
  private wholeLineSelected = false;

  constructor(private readonly notation: KeyNotation = new KeyNotation()) {}

  get text(): string {
    return this.value;
  }

  get beforeCursor(): string {
    return this.value.slice(0, this.position);
  }

  get underCursor(): string {
    return this.value.charAt(this.position);
  }

  get afterCursor(): string {
    return this.value.slice(this.position + 1);
  }

  get isAllSelected(): boolean {
    return this.wholeLineSelected;
  }

  replace(text: string): void {
    this.value = text;
    this.position = text.length;
    this.wholeLineSelected = false;
  }

  press(token: string): boolean {
    const edit = this.edits()[token];
    if (edit) edit();
    else if (this.notation.isPrintable(token)) this.insert(token);
    else return false;
    return true;
  }

  private edits(): Readonly<Record<string, () => void>> {
    return {
      "<BS>": () => this.delete(() => this.deleteCharacterBefore()),
      "<C-h>": () => this.delete(() => this.deleteCharacterBefore()),
      "<C-w>": () => this.delete(() => this.deleteWordBefore()),
      "<C-u>": () => this.delete(() => this.keepAfterCursor()),
      "<C-k>": () => this.delete(() => this.keepBeforeCursor()),
      "<C-a>": () => this.selectAll(),
      "<C-e>": () => this.moveTo(this.value.length),
      "<Left>": () => this.moveTo(this.position - 1),
      "<Right>": () => this.moveTo(this.position + 1),
    };
  }

  private insert(text: string): void {
    if (this.wholeLineSelected) this.replace("");
    this.splice(this.beforeCursor + text, this.value.slice(this.position));
  }

  private delete(deletion: () => void): void {
    if (this.wholeLineSelected) this.replace("");
    else deletion();
  }

  private deleteCharacterBefore(): void {
    this.splice(this.beforeCursor.slice(0, -1), this.value.slice(this.position));
  }

  private deleteWordBefore(): void {
    this.splice(this.beforeCursor.replace(WORD_BEFORE_CURSOR, ""), this.value.slice(this.position));
  }

  private keepAfterCursor(): void {
    this.splice("", this.value.slice(this.position));
  }

  private keepBeforeCursor(): void {
    this.splice(this.beforeCursor, "");
  }

  private selectAll(): void {
    this.wholeLineSelected = this.value.length > 0;
  }

  private moveTo(position: number): void {
    this.wholeLineSelected = false;
    this.position = Math.min(Math.max(position, 0), this.value.length);
  }

  private splice(before: string, after: string): void {
    this.value = before + after;
    this.position = before.length;
    this.wholeLineSelected = false;
  }
}
