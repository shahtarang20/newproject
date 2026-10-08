import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import type { ProductCardProps } from '../types';
import { PatternFallback, priceOf } from './lib';

export default function ProductCard({ product, shop, onQuickAdd, priority }: ProductCardProps) {
  const price = priceOf(product, shop);
  const img = product.primaryImageUrl ?? product.media[0]?.url;
  const href = `/shop/${shop.slug}/product/${product.slug}`;
  const soldOut = !product.inStock;
  const colours = product.colours.slice(0, 5);

  return (
    <article className="group relative text-center">
      <Link
        to={href}
        aria-label={product.name}
        className="block rounded-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--sf-primary)]"
      >
        <div className="relative rounded-t-[999px] rounded-b-[4px] border border-[color:var(--sf-accent)] p-1.5 transition-shadow duration-500 group-hover:shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--sf-primary)_45%,transparent)]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2px] bg-[color:var(--sf-muted)]">
            {img ? (
              <img
                src={img}
                alt={product.media[0]?.alt ?? product.name}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${soldOut ? 'opacity-60 grayscale' : ''}`}
              />
            ) : (
              <PatternFallback className="h-full w-full" />
            )}
            {product.offerBadge && !soldOut && (
              <span className="absolute left-1/2 top-[18%] -translate-x-1/2 whitespace-nowrap bg-[color:var(--sf-primary)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--sf-primary-fg)]">
                {product.offerBadge}
              </span>
            )}
            {soldOut && (
              <span className="absolute inset-x-0 bottom-3 mx-auto w-fit bg-[color:var(--sf-bg)]/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--sf-primary)]">
                Sold out
              </span>
            )}
          </div>
        </div>

        <div className="px-1 pt-3">
          {product.category && (
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--sf-muted-fg)]">{product.category.name}</p>
          )}
          <h3 className="mt-1 line-clamp-2 font-display text-[1.1rem] font-semibold leading-snug text-[color:var(--sf-fg)] transition-colors group-hover:text-[color:var(--sf-primary)]">
            {product.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-2">
            {price.hidden ? (
              <span className="text-xs italic text-[color:var(--sf-muted-fg)]">Contact shop for price</span>
            ) : (
              <>
                <span className="font-display text-xl font-semibold text-[color:var(--sf-primary)]">{price.selling}</span>
                {price.mrp && <s className="text-xs text-[color:var(--sf-muted-fg)]">{price.mrp}</s>}
                {price.discount && (
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--sf-accent)]">
                    {price.discount}% off
                  </span>
                )}
              </>
            )}
          </div>
          {colours.length > 0 && (
            <ul className="mt-2 flex items-center justify-center gap-1.5" aria-label="Available colours">
              {colours.map((c) => (
                <li
                  key={c.name}
                  title={c.name}
                  className="h-3.5 w-3.5 rotate-45 border border-[color:var(--sf-accent)]"
                  style={{ background: c.hex ?? 'var(--sf-muted)' }}
                />
              ))}
              {product.colours.length > 5 && (
                <li className="text-[10px] text-[color:var(--sf-muted-fg)]">+{product.colours.length - 5}</li>
              )}
            </ul>
          )}
          {product.lowStock && !soldOut && (
            <p className="mt-1.5 text-[11px] italic text-[color:var(--sf-primary)]">Only a few pieces left</p>
          )}
        </div>
      </Link>
      {onQuickAdd && !soldOut && !price.hidden && (
        <button
          type="button"
          onClick={() => onQuickAdd(product)}
          aria-label={`Quick add ${product.name} to bag`}
          className="absolute right-3 top-[38%] flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--sf-accent)] bg-[color:var(--sf-card)] text-[color:var(--sf-primary)] opacity-100 shadow transition hover:bg-[color:var(--sf-primary)] hover:text-[color:var(--sf-primary-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--sf-primary)] md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <ShoppingBag size={16} aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
