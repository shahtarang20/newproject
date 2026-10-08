import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { ProductCardProps } from '../types';
import { BlushFallback, priceOf } from './lib';

export default function ProductCard({ product, shop, onQuickAdd, priority }: ProductCardProps) {
  const price = priceOf(product, shop);
  const img = product.primaryImageUrl ?? product.media[0]?.url;
  const soldOut = !product.inStock;
  const href = `/shop/${shop.slug}/product/${product.slug}`;

  return (
    <article className="group relative flex h-full flex-col rounded-[24px] bg-[color:var(--sf-card)] p-2.5 shadow-[0_6px_24px_-14px_rgba(194,71,107,.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--sf-shadow)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-3">
      <Link
        to={href}
        aria-label={product.name}
        className="flex flex-1 flex-col rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-primary)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-[color:var(--sf-muted)] transition-[border-radius] duration-500 ease-out group-hover:rounded-t-[999px] group-hover:rounded-b-[20px] group-focus-within:rounded-t-[999px] motion-reduce:transition-none">
          {img ? (
            <img
              src={img}
              alt={product.media[0]?.alt ?? product.name}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none ${soldOut ? 'opacity-60 saturate-50' : ''}`}
            />
          ) : (
            <BlushFallback className="h-full w-full" label={product.name.charAt(0)} />
          )}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {product.offerBadge && !soldOut && (
              <span className="rounded-full bg-[color:var(--sf-primary)] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[color:var(--sf-primary-fg)]">{product.offerBadge}</span>
            )}
            {price.hidden === false && price.discount && !soldOut && (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[color:var(--sf-primary)]">{price.discount}% off</span>
            )}
          </div>
          {soldOut && (
            <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[color:var(--sf-muted-fg)]">Sold out</span>
          )}
        </div>
        <div className="px-1.5 pb-1 pt-3">
          <h3 className="line-clamp-2 font-display text-[15px] font-medium italic leading-snug md:text-base">{product.name}</h3>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            {price.hidden ? (
              <span className="text-xs font-semibold text-[color:var(--sf-muted-fg)]">Contact shop for price</span>
            ) : (
              <>
                <span className="text-base font-bold text-[color:var(--sf-primary)]">{price.selling}</span>
                {price.mrp && <s className="text-xs text-[color:var(--sf-muted-fg)]">{price.mrp}</s>}
              </>
            )}
          </div>
          {product.colours.length > 0 && (
            <ul className="mt-2 flex flex-wrap items-center gap-1" aria-label="Colours">
              {product.colours.slice(0, 4).map((c) => (
                <li key={c.name} title={c.name} className="flex items-center gap-1 rounded-full border border-[color:var(--sf-border)] bg-white/70 py-0.5 pl-0.5 pr-2 text-[10px] font-semibold text-[color:var(--sf-muted-fg)]">
                  <span className="h-3.5 w-3.5 rounded-full border border-white shadow-sm" style={{ background: c.hex ?? 'var(--sf-accent)' }} />
                  <span className="hidden max-w-[56px] truncate sm:inline">{c.name}</span>
                </li>
              ))}
              {product.colours.length > 4 && <li className="text-[10px] font-semibold text-[color:var(--sf-muted-fg)]">+{product.colours.length - 4}</li>}
            </ul>
          )}
          {product.lowStock && !soldOut && (
            <p className="mt-1.5 text-sm text-[color:var(--sf-primary)]" style={{ fontFamily: 'var(--sf-font-script)' }}>hurry, only a few left!</p>
          )}
        </div>
      </Link>
      {onQuickAdd && !soldOut && !price.hidden && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          onClick={() => onQuickAdd(product)}
          aria-label={`Add ${product.name} to bag`}
          className="mx-1.5 mb-1 mt-2 flex items-center justify-center gap-1 rounded-[var(--sf-btn-radius)] bg-[color:var(--sf-primary)] py-2 text-sm font-bold text-[color:var(--sf-primary-fg)] shadow-[0_8px_18px_-8px_var(--sf-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-primary)]"
        >
          <Plus size={15} aria-hidden="true" /> Add
        </motion.button>
      )}
    </article>
  );
}
