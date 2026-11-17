import type { Account } from "../bridge/Protocol";

export class AccountRoster {
  private accounts: Account[] = [];
  private currentIndex = 0;

  get current(): string {
    const account = this.accounts[this.currentIndex];
    if (!account) throw new Error("no account: add one with `knave-mail accounts add`");
    return account.email;
  }

  get isEmpty(): boolean {
    return this.accounts.length === 0;
  }

  load(accounts: Account[]): void {
    this.accounts = accounts;
  }

  moveTo(index: number): void {
    this.currentIndex = index;
  }

  startIndex(preferred: string): number {
    const index = this.accounts.findIndex((account) => account.email === preferred);
    return Math.max(0, index);
  }

  indexAfter(step: number): number {
    const count = this.accounts.length;
    if (count === 0) throw new Error("no account to switch to");
    return (this.currentIndex + step + count) % count;
  }

  indexMatching(search: string): number {
    const exact = this.accounts.findIndex((account) => account.email === search);
    if (exact >= 0) return exact;
    const partial = this.accounts.flatMap((account, index) => (account.email.includes(search) ? [index] : []));
    if (partial.length !== 1) throw new Error(`no single account matches ${search}`);
    return partial[0] ?? 0;
  }
}
