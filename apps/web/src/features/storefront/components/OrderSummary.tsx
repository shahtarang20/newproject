import type { PricedCart } from '@/types/storefront';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';

export function OrderSummary({ priced, estimate, currency, dim, className }: { priced?: PricedCart; estimate: number; currency: string; dim?: boolean; className?: string }) {
  const row = 'flex justify-between text-sm';
  const money = (n: number) => formatMoney(n, currency);
  return (
    <dl className={cn('space-y-2 transition-opacity', dim && 'opacity-60', className)} aria-live="polite">
      <div className={row}>
        <dt className="text-[color:var(--sf-muted-fg)]">Subtotal</dt>
        <dd>{money(priced?.subtotalMinor ?? estimate)}</dd>
      </div>
      {priced && priced.discountMinor > 0 && (
        <div className={cn(row, 'text-green-700')}>
          <dt>Discount{priced.coupon?.valid ? ` (${priced.coupon.code})` : ''}</dt>
          <dd>− {money(priced.discountMinor)}</dd>
        </div>
      )}
      {priced && priced.taxMinor > 0 && (
        <div className={row}>
          <dt className="text-[color:var(--sf-muted-fg)]">Tax</dt>
          <dd>{money(priced.taxMinor)}</dd>
        </div>
      )}
      {priced && (
        <div className={row}>
          <dt className="text-[color:var(--sf-muted-fg)]">Shipping</dt>
          <dd>{priced.shippingMinor > 0 ? money(priced.shippingMinor) : 'Free'}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-[color:var(--sf-border)] pt-3 font-display text-xl font-semibold">
        <dt>Total</dt>
        <dd className="text-[color:var(--sf-primary)]">{money(priced?.totalMinor ?? estimate)}</dd>
      </div>
    </dl>
  );
}
