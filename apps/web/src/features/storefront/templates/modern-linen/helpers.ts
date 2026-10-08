import type { PublicShop } from '@/types/storefront';

const SHORT: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

export function dayLabel(day: string): string {
  return SHORT[day] ?? day;
}

export function todayHours(shop: PublicShop): string | undefined {
  const idx = (new Date().getDay() + 6) % 7;
  const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const h = shop.businessHours.find((b) => b.day === order[idx]);
  if (!h) return undefined;
  return h.open && h.openTime ? `Open today ${h.openTime} - ${h.closeTime ?? ''}` : 'Closed today';
}

export function addressLine(shop: PublicShop): string {
  const a = shop.address;
  return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ');
}

export function waLink(shop: PublicShop): string | undefined {
  const n = (shop.whatsapp ?? '').replace(/\D/g, '');
  return n ? `https://wa.me/${n}` : undefined;
}

export function socialLink(v: string | undefined, base: string): string | undefined {
  if (!v) return undefined;
  return /^https?:/i.test(v) ? v : `${base}${v.replace(/^@/, '')}`;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}
