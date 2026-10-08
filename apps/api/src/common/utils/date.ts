export const dayKey = (d: Date = new Date()): string => d.toISOString().slice(0, 10);

export const startOfUtcDay = (d: Date = new Date()): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * 86_400_000);

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

/** Whole calendar-month periods elapsed between `start` and `now` (>= 0). */
export function monthsElapsed(start: Date, now: Date = new Date()): number {
  let m = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth());
  if (addMonths(start, m).getTime() > now.getTime()) m -= 1;
  return Math.max(0, m);
}

export const parseDate = (v: unknown): Date | undefined => {
  if (typeof v !== 'string' && !(v instanceof Date)) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
