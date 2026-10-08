import { Counter } from '@/database/models/counter.model';

export function formatOrderNumber(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}

/** Atomic per shop+year sequence → `{PREFIX}-{YYYY}-{000123}`. */
export async function nextOrderNumber(shopId: string, prefix: string, now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `order:${shopId}:${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return formatOrderNumber(prefix, year, counter?.seq ?? 1);
}

/** Derive a short uppercase order prefix from a shop name (A-Z0-9, 2-5 chars). */
export function derivePrefix(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (letters.slice(0, 4) || 'SHOP').padEnd(2, 'X');
}
