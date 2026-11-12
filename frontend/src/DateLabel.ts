export class DateLabel {
  private readonly time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
  private readonly dayInYear = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  private readonly fullDate = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });
  private readonly dateAndTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  constructor(private readonly now: () => Date = () => new Date()) {}

  short(timestamp: number): string {
    const date = new Date(timestamp);
    const today = this.now();
    if (date.toDateString() === today.toDateString()) return this.time.format(date);
    if (date.getFullYear() === today.getFullYear()) return this.dayInYear.format(date);
    return this.fullDate.format(date);
  }

  long(timestamp: number): string {
    return this.dateAndTime.format(new Date(timestamp));
  }
}
