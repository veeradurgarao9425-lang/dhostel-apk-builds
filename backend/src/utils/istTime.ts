/**
 * India Standard Time helpers. The server (and DB) may run in UTC, so cron jobs
 * must not rely on server-local time, `toISOString()` dates, or SQL CURDATE().
 */
export const IST_TZ = 'Asia/Kolkata';

const parts = (d: Date) => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const o: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) o[p.type] = p.value;
  return o;
};

/** 'YYYY-MM-DD' in IST */
export const istToday = (d: Date = new Date()): string => {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
};

/** Day of month (1-31) in IST */
export const istDayOfMonth = (d: Date = new Date()): number => Number(parts(d).day);

/** Day of week in IST: 0 = Sunday ... 6 = Saturday */
export const istDayOfWeek = (d: Date = new Date()): number =>
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts(d).weekday);

/** 'YYYY-MM-DD' for IST today + n days */
export const istAddDays = (n: number): string => {
  const [y, m, d] = istToday().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().split('T')[0];
};

/** First day of the current IST month, 'YYYY-MM-01' */
export const istMonthStart = (): string => `${istToday().slice(0, 7)}-01`;

export const inr = (n: number): string => `₹${Number(n || 0).toLocaleString('en-IN')}`;
