// GitHub Actions runs in UTC; every date is formatted in Jakarta time so a Note
// written at 07:12 WIB doesn't show 00:12.
// en-US only for the name tables (en-GB abbreviates September as "Sept"); order is built by hand.
const TZ = 'Asia/Jakarta';

const parts = (date: Date, opts: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );

/** "26 Sep" — post list date column. */
export function listDate(date: Date): string {
  const p = parts(date, { day: 'numeric', month: 'short' });
  return `${p.day} ${p.month}`;
}

/** "2026" — blog list year headings. */
export function year(date: Date): string {
  return parts(date, { year: 'numeric' }).year;
}

/** "24 September 2026" — Essays. */
export function longDate(date: Date): string {
  const p = parts(date, { day: 'numeric', month: 'long', year: 'numeric' });
  return `${p.day} ${p.month} ${p.year}`;
}

/** "Saturday 26 September 2026, 07:12" — Notes always show capture time. */
export function noteStamp(date: Date, short = false): string {
  const p = parts(date, {
    weekday: short ? 'short' : 'long',
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${p.weekday} ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
}

/** "26 Sep 2026" — story image date for Essays. */
export function shortDate(date: Date): string {
  const p = parts(date, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${p.day} ${p.month} ${p.year}`;
}

export const isoDate = (date: Date) => date.toISOString();
