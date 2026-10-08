import type { PublicProduct, PublicVariant } from '@/types/storefront';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import { discountPct } from './lib';

interface Props {
  product: PublicProduct;
  currency: string;
  /** when a variant is selected its price replaces the "from" range */
  variant?: PublicVariant;
  size?: 'md' | 'lg';
  className?: string;
}

export function PriceTag({ product, currency, variant, size = 'md', className }: Props) {
  if (product.price.hidden) {
    return <p className={cn('text-sm italic text-[color:var(--sf-muted-fg)]', className)}>Contact shop for price</p>;
  }
  const selling = variant ? variant.priceMinor : product.price.sellingMinor;
  const mrp = variant ? variant.mrpMinor : product.price.mrpMinor;
  if (selling === undefined) {
    return <p className={cn('text-sm italic text-[color:var(--sf-muted-fg)]', className)}>Contact shop for price</p>;
  }
  const pct = variant ? discountPct(selling, mrp) : (product.price.discountPercent ?? discountPct(selling, mrp));
  const isRange = !variant && product.price.maxSellingMinor !== undefined && product.price.maxSellingMinor > selling;
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2.5 gap-y-1', className)}>
      <span className={cn('font-display font-semibold text-[color:var(--sf-primary)]', size === 'lg' ? 'text-3xl' : 'text-xl')}>
        {isRange && <span className="mr-1 text-xs font-normal uppercase tracking-wider text-[color:var(--sf-muted-fg)]">From</span>}
        {formatMoney(selling, currency)}
      </span>
      {mrp !== undefined && mrp > selling && (
        <>
          <s className="text-sm text-[color:var(--sf-muted-fg)]" aria-label={`MRP ${formatMoney(mrp, currency)}`}>
            {formatMoney(mrp, currency)}
          </s>
          {pct ? <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--sf-accent)]">{pct}% off</span> : null}
        </>
      )}
    </div>
  );
}
