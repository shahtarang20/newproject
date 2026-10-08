import type { PublicBusinessHour, PublicProduct, PublicShop } from '@/types/storefront';
import { formatMoney } from '@/utils/format';

export const MONO = { fontFamily: 'var(--sf-font-mono)' } as const;

/** Greyscale diagonal-hatch fallback. */
export function HatchFallback({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-[color:var(--sf-muted)] text-[color:var(--sf-muted-fg)] ${className}`}
      style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 10px, rgba(0,0,0,.05) 10px 11px)' }}
      aria-hidden="true"
    >
      {label && <span className="font-display text-6xl font-bold uppercase">{label}</span>}
    </div>
  );
}

export function priceOf(p: PublicProduct, shop: PublicShop) {
  const { price } = p;
  if (price.hidden || price.sellingMinor == null) return { hidden: true as const };
  const from = price.maxSellingMinor != null && price.maxSellingMinor > price.sellingMinor;
  return {
    hidden: false as const,
    selling: (from ? 'FROM ' : '') + formatMoney(price.sellingMinor, shop.currency),
    mrp: price.mrpMinor && price.mrpMinor > price.sellingMinor ? formatMoney(price.mrpMinor, shop.currency) : undefined,
    discount: price.discountPercent && price.discountPercent > 0 ? Math.round(price.discountPercent) : undefined,
  };
}

const DAY: Record<string, string> = {
  MONDAY: 'MON', TUESDAY: 'TUE', WEDNESDAY: 'WED', THURSDAY: 'THU', FRIDAY: 'FRI', SATURDAY: 'SAT', SUNDAY: 'SUN',
};
export const dayLabel = (h: PublicBusinessHour) => DAY[h.day] ?? h.day;
export const hoursLabel = (h: PublicBusinessHour) => (h.open ? `${h.openTime ?? ''}–${h.closeTime ?? ''}` : 'CLOSED');

export function addressLine(shop: PublicShop) {
  const a = shop.address;
  return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ');
}
export const waHref = (shop: PublicShop) =>
  shop.whatsapp ? `https://wa.me/${shop.whatsapp.replace(/\D/g, '')}` : undefined;
export function socialHref(v: string | undefined, base: string) {
  if (!v) return undefined;
  return /^https?:/.test(v) ? v : `${base}${v.replace(/^@/, '')}`;
}
export const pad = (n: number) => String(n).padStart(2, '0');
