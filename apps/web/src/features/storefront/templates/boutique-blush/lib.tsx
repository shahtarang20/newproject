import type { PublicBusinessHour, PublicProduct, PublicShop } from '@/types/storefront';
import { formatMoney } from '@/utils/format';

export const SCRIPT = { fontFamily: 'var(--sf-font-script)' } as const;
export const SHADOW = 'shadow-[var(--sf-shadow)]';

export function Blossom({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="20" cy="10" rx="6" ry="9" fill="currentColor" opacity=".55" transform={`rotate(${r} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function BlushFallback({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden text-[color:var(--sf-primary)] ${className}`}
      style={{ background: 'radial-gradient(circle at 25% 20%, #fff 0, transparent 40%), linear-gradient(150deg, var(--sf-accent), var(--sf-muted))' }}
      aria-hidden="true"
    >
      <Blossom className="absolute -right-4 -top-4 h-24 w-24 opacity-40" />
      <Blossom className="absolute -bottom-6 -left-6 h-28 w-28 opacity-30" />
      {label && <span className="relative font-display text-5xl italic">{label}</span>}
    </div>
  );
}

export function priceOf(p: PublicProduct, shop: PublicShop) {
  const { price } = p;
  if (price.hidden || price.sellingMinor == null) return { hidden: true as const };
  const from = price.maxSellingMinor != null && price.maxSellingMinor > price.sellingMinor;
  return {
    hidden: false as const,
    selling: (from ? 'From ' : '') + formatMoney(price.sellingMinor, shop.currency),
    mrp: price.mrpMinor && price.mrpMinor > price.sellingMinor ? formatMoney(price.mrpMinor, shop.currency) : undefined,
    discount: price.discountPercent && price.discountPercent > 0 ? Math.round(price.discountPercent) : undefined,
  };
}

const DAY: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};
export const dayLabel = (h: PublicBusinessHour) => DAY[h.day] ?? h.day;
export const hoursLabel = (h: PublicBusinessHour) => (h.open ? `${h.openTime ?? ''} – ${h.closeTime ?? ''}` : 'Closed');
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
