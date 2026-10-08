import type { PublicShop } from '@/types/storefront';

export const DAY_LABEL: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

export function shopAddress(shop: PublicShop): string {
  const a = shop.address;
  return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ');
}

export function digits(v?: string): string {
  return (v ?? '').replace(/\D/g, '');
}

export function socialUrl(v: string | undefined, base: string): string | undefined {
  if (!v) return undefined;
  return /^https?:/i.test(v) ? v : `${base}${v.replace(/^@/, '')}`;
}

export const BTN =
  'inline-flex items-center justify-center gap-2 font-display uppercase tracking-wider border-2 border-[var(--sf-fg)] ' +
  'rounded-[var(--sf-btn-radius)] px-5 py-3 transition-transform focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-primary)]';
