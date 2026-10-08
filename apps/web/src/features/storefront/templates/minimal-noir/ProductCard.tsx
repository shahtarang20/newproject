import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ProductCardProps } from '../types';
import { HatchFallback, MONO, priceOf } from './lib';

/** Index number derived from a stable hash of the id so the card needs no list context. */
function indexOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 97;
  return String(h + 1).padStart(2, '0');
}

export default function ProductCard({ product, shop, onQuickAdd, priority }: ProductCardProps) {
  const price = priceOf(product, shop);
  const images = product.media.filter((m) => m.kind === 'IMAGE');
  const first = product.primaryImageUrl ?? images[0]?.url;
  const second = images.find((m) => m.url !== first)?.url;
  const soldOut = !product.inStock;
  const idx = useMemo(() => indexOf(product.id), [product.id]);
  const href = `/shop/${shop.slug}/product/${product.slug}`;

  return (
    <article className="group relative flex h-full flex-col bg-[color:var(--sf-bg)]">
      <Link
        to={href}
        aria-label={product.name}
        className="flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--sf-fg)]"
      >
        <div className="flex items-center justify-between px-3 pb-2 pt-3 text-[10px] uppercase tracking-[0.15em]" style={MONO}>
          <span>{idx}</span>
          <span className="text-[color:var(--sf-muted-fg)]">{product.category?.name ?? product.fabric ?? ''}</span>
        </div>
        <div className="relative aspect-[3/4] overflow-hidden bg-[color:var(--sf-muted)]">
          {first ? (
            <>
              <img
                src={first}
                alt={product.name}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover grayscale-[20%] transition duration-500 group-hover:grayscale-0 ${second ? 'group-hover:opacity-0 group-focus-visible:opacity-0' : 'group-hover:scale-[1.03]'} ${soldOut ? 'opacity-50' : ''}`}
              />
              {second && (
                <img
                  src={second}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              )}
            </>
          ) : (
            <HatchFallback className="absolute inset-0" label={idx} />
          )}
          <div className="absolute left-0 top-0 flex flex-col items-start gap-1">
            {product.offerBadge && !soldOut && (
              <span className="bg-[color:var(--sf-fg)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--sf-bg)]" style={MONO}>
                {product.offerBadge}
              </span>
            )}
            {price.hidden === false && price.discount && !soldOut && (
              <span className="border border-[color:var(--sf-fg)] bg-[color:var(--sf-bg)] px-2 py-1 text-[10px] tracking-[0.12em]" style={MONO}>
                -{price.discount}%
              </span>
            )}
          </div>
          {soldOut && (
            <span className="absolute inset-x-0 bottom-0 bg-[color:var(--sf-fg)] py-1.5 text-center text-[10px] uppercase tracking-[0.2em] text-[color:var(--sf-bg)]" style={MONO}>
              Sold out
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-3">
          <h3 className="line-clamp-2 font-display text-sm font-medium uppercase leading-tight tracking-[-0.01em] md:text-[15px]">
            {product.name}
          </h3>
          <div className="flex flex-wrap items-baseline gap-x-2 text-xs" style={MONO}>
            {price.hidden ? (
              <span className="text-[color:var(--sf-muted-fg)]">Contact shop for price</span>
            ) : (
              <>
                <span className="font-medium">{price.selling}</span>
                {price.mrp && <s className="text-[color:var(--sf-muted-fg)]">{price.mrp}</s>}
              </>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between pt-1">
            {product.colours.length > 0 ? (
              <ul className="flex items-center gap-1" aria-label="Colours">
                {product.colours.slice(0, 5).map((c) => (
                  <li key={c.name} title={c.name} className="h-2.5 w-2.5 border border-[color:var(--sf-fg)]" style={{ background: c.hex ?? 'transparent' }} />
                ))}
              </ul>
            ) : <span />}
            {product.lowStock && !soldOut && (
              <span className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--sf-muted-fg)]" style={MONO}>Few left</span>
            )}
          </div>
        </div>
      </Link>
      {onQuickAdd && !soldOut && !price.hidden && (
        <button
          type="button"
          onClick={() => onQuickAdd(product)}
          aria-label={`Quick add ${product.name}`}
          className="mx-3 mb-3 border border-[color:var(--sf-fg)] py-2 text-[10px] uppercase tracking-[0.2em] transition-colors hover:bg-[color:var(--sf-fg)] hover:text-[color:var(--sf-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-fg)] [border-radius:var(--sf-btn-radius)]"
          style={MONO}
        >
          + Add to bag
        </button>
      )}
    </article>
  );
}
