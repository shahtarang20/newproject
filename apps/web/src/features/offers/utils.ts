import { z } from 'zod';
import { fromMinor, toMinor, type DiscountType } from '@vastra/shared';
import { formatMoney } from '@/utils/format';
import type { PromoState } from '@/types/commerce';

export function promoState(p: { isActive: boolean; startsAt?: string | null; endsAt?: string | null }, now = Date.now()): PromoState {
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return 'expired';
  if (!p.isActive) return 'inactive';
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'scheduled';
  return 'active';
}

export const PROMO_STATE_LABEL: Record<PromoState, string> = { active: 'Active', scheduled: 'Scheduled', expired: 'Expired', inactive: 'Inactive' };
export const PROMO_STATE_VARIANT: Record<PromoState, 'success' | 'info' | 'neutral' | 'warning'> = {
  active: 'success', scheduled: 'info', expired: 'neutral', inactive: 'warning',
};

export function describeDiscount(type: DiscountType, value: number, buyQty?: number, getQty?: number, currency = 'INR'): string {
  if (type === 'PERCENT') return `${value}% off`;
  if (type === 'FLAT') return `${formatMoney(value, currency)} off`;
  return `Buy ${buyQty ?? '?'} get ${getQty ?? '?'} free`;
}

/** ISO -> yyyy-MM-dd in local time for <input type="date">. */
export function isoToDateInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const startOfDayIso = (s: string): string | null => (s ? new Date(`${s}T00:00:00`).toISOString() : null);
export const endOfDayIso = (s: string): string | null => (s ? new Date(`${s}T23:59:59.999`).toISOString() : null);

export const majorStr = (minor?: number | null): string => (minor == null ? '' : String(fromMinor(minor)));
export const minorOrUndef = (s: string): number | undefined => (s.trim() === '' ? undefined : toMinor(Number(s)));

/** Optional non-negative number held as a string in the form. */
export const optNumber = z.string().trim().refine((s) => s === '' || (!Number.isNaN(Number(s)) && Number(s) >= 0), 'Enter a valid number');
export const optInt = z.string().trim().refine((s) => s === '' || (/^\d+$/.test(s) && Number(s) >= 1), 'Enter a whole number, 1 or more');

export function datesOrder(v: { startsAt: string; endsAt: string }, ctx: z.RefinementCtx): void {
  if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End date must be after start date' });
}
