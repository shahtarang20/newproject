import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { formatMoney } from '@/utils/format';
import type { ProductCardProps } from '../types';

export default function ProductCard({ product, shop, onQuickAdd, priority }: ProductCardProps) {
  const href = `/shop/${shop.slug}/product/${product.slug}`;
  const { price } = product;
  const img = product.primaryThumbUrl ?? product.primaryImageUrl;
  const tags = [product.fabric, ...(product.occasion ?? [])].filter(Boolean).slice(0, 2) as string[];
  const discounted = !price.hidden && price.mrpMinor && price.sellingMinor && price.mrpMinor > price.sellingMinor;

  return (
    <article className="group relative">
      <Link
        to={href}
        aria-label={product.name}
        className="block rounded-[18px] bg-[var(--sf-card)] p-2.5 outline-none ring-offset-2 ring-offset-[var(--sf-bg)] transition-colors duration-500 hover:bg-[var(--sf-muted)] focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[var(--sf-muted)]">
          {img ? (
            <img
              src={img}
              alt={product.media[0]?.alt ?? product.name}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={cn(
                'h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.05] motion-reduce:transition-none',
                !product.inStock && 'opacity-60 grayscale-[40%]',
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-5xl italic text-[var(--sf-accent)]/50">
              {product.name.charAt(0)}
            </div>
          )}
          {product.offerBadge && (
            <span className={`absolute left-2.5 max-w-[calc(100%-1.25rem)] truncate rounded-full bg-[var(--sf-fg)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sf-bg)] ${product.inStock ? 'bottom-2.5' : 'bottom-10'}`}>
              {product.offerBadge}
            </span>
          )}
          {!product.inStock && (
            <span className="absolute inset-x-0 bottom-0 bg-[var(--sf-bg)]/85 py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--sf-muted-fg)]">
              Sold out
            </span>
          )}
        </div>

        <div className="px-1.5 pb-1.5 pt-3.5 transition-transform duration-500 group-hover:-translate-y-0.5 motion-reduce:transform-none">
          {tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full border border-[var(--sf-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--sf-muted-fg)]">
                  {t}
                </span>
              ))}
            </div>
          )}
          <h3 className="line-clamp-2 font-display text-[17px] font-normal leading-snug">{product.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            {price.hidden || price.sellingMinor === undefined ? (
              <span className="text-[var(--sf-muted-fg)]">Contact shop for price</span>
            ) : (
              <>
                <span className="font-medium">{formatMoney(price.sellingMinor, shop.currency)}</span>
                {discounted && (
                  <>
                    <s className="text-xs text-[var(--sf-muted-fg)]">{formatMoney(price.mrpMinor!, shop.currency)}</s>
                    {price.discountPercent ? (
                      <span className="text-xs font-medium text-[var(--sf-primary)]">{Math.round(price.discountPercent)}% off</span>
                    ) : null}
                  </>
                )}
              </>
            )}
          </div>
          {product.colours.length > 0 && (
            <ul className="mt-2.5 flex items-center gap-1.5" aria-label="Colours">
              {product.colours.slice(0, 5).map((c) => (
                <li key={c.name} className="group/dot relative">
                  <span
                    title={c.name}
                    className="block h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ background: c.hex || 'var(--sf-border)' }}
                  />
                  <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--sf-fg)] px-1.5 py-0.5 text-[10px] text-[var(--sf-bg)] opacity-0 transition-opacity group-hover/dot:opacity-100">
                    {c.name}
                  </span>
                </li>
              ))}
              {product.colours.length > 5 && <li className="text-[11px] text-[var(--sf-muted-fg)]">+{product.colours.length - 5}</li>}
            </ul>
          )}
          {product.inStock && product.lowStock && (
            <p className="mt-2 text-xs text-[var(--sf-primary)]">Only a few left</p>
          )}
        </div>
      </Link>
      {onQuickAdd && product.inStock && !price.hidden && (
        <button
          type="button"
          onClick={() => onQuickAdd(product)}
          aria-label={`Quick add ${product.name}`}
          className="absolute right-5 top-5 translate-y-1 rounded-[var(--sf-btn-radius)] bg-[var(--sf-card)]/95 px-3 py-1.5 text-xs font-medium text-[var(--sf-fg)] opacity-0 shadow-sm outline-none transition-all duration-300 hover:bg-[var(--sf-primary)] hover:text-[var(--sf-primary-fg)] focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)] group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100"
        >
          + Add
        </button>
      )}
    </article>
  );
}
