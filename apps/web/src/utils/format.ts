/** Money is integer minor units (paise). Format only at the UI edge. */
const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(minor: number, currency = 'INR', locale = 'en-IN'): string {
  const key = `${locale}:${currency}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 });
    formatterCache.set(key, fmt);
  }
  return fmt.format(minor / 100);
}

export function formatDate(value: string | number | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | number | Date): string {
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}
