import type { PublicBusinessHour, PublicProduct, PublicShop } from '@/types/storefront';
import { formatMoney } from '@/utils/format';

export const GOLD = 'var(--sf-accent)';

/** Ornamental divider: line – paisley diamond – line. */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 24" className={className} aria-hidden="true" fill="none" stroke={GOLD} strokeWidth="1">
      <path d="M0 12h92M148 12h92" />
      <path d="M120 3l7 9-7 9-7-9z" fill={GOLD} fillOpacity=".25" />
      <circle cx="104" cy="12" r="2" fill={GOLD} />
      <circle cx="136" cy="12" r="2" fill={GOLD} />
      <path d="M96 12c-3-5-8-5-8 0M144 12c3-5 8-5 8 0" />
    </svg>
  );
}

/** Corner mandala/paisley motif; rotate with Tailwind classes. */
export function Corner({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none" stroke={GOLD} strokeWidth="1.2">
      <path d="M2 62V2h60" />
      <path d="M10 54V10h44" strokeOpacity=".6" />
      <path d="M18 18c12 0 18 6 18 14-6 0-10-4-10-8s-4-6-8-6z" fill={GOLD} fillOpacity=".2" />
      <circle cx="18" cy="18" r="3" fill={GOLD} />
      <path d="M26 40c0-8 6-12 12-12 0 8-4 12-12 12z" strokeOpacity=".7" />
    </svg>
  );
}

/** Subtle repeating pattern used as image fallback. */
export function PatternFallback({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background:
          'radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--sf-accent) 35%, transparent), transparent 55%), linear-gradient(160deg, var(--sf-primary), color-mix(in srgb, var(--sf-primary) 70%, #000))',
      }}
      aria-hidden={label ? undefined : true}
    >
      <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden="true">
        <defs>
          <pattern id="hg-pat" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M20 4l12 16-12 16-12-16z" fill="none" stroke="#c9a24a" strokeWidth="1" />
            <circle cx="20" cy="20" r="2" fill="#c9a24a" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hg-pat)" />
      </svg>
      {label && <span className="relative font-display text-4xl text-[color:var(--sf-accent)]">{label}</span>}
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

export function hoursLabel(h: PublicBusinessHour) {
  return h.open ? `${h.openTime ?? ''} – ${h.closeTime ?? ''}` : 'Closed';
}
export const dayLabel = (h: PublicBusinessHour) => DAY[h.day] ?? h.day;

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

export function heroImages(featured?: PublicProduct[]) {
  return (featured ?? []).map((p) => p.primaryImageUrl ?? p.media[0]?.url).filter((u): u is string => !!u);
}
