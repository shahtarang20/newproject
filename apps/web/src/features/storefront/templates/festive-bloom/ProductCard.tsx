import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatMoney } from '@/utils/format';
import type { ProductCardProps } from '../types';
import { Starburst } from './Decor';

export default function ProductCard({ product, shop, onQuickAdd, priority }: ProductCardProps) {
  const { price } = product;
  const img = product.primaryThumbUrl ?? product.primaryImageUrl;
  const discounted = !price.hidden && price.mrpMinor && price.sellingMinor && price.mrpMinor > price.sellingMinor;
  const pct = price.discountPercent ? Math.round(price.discountPercent) : 0;

  return (
    <motion.article
      whileHover={{ y: -8, rotate: -0.8 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
      className="group relative flex h-full flex-col rounded-[24px] border-2 border-[var(--sf-border)] bg-[var(--sf-card)] p-2 shadow-[0_6px_0_0_var(--sf-border)] transition-colors hover:border-[var(--sf-accent)] focus-within:border-[var(--sf-primary)]"
    >
      <Link to={`/shop/${shop.slug}/product/${product.slug}`} aria-label={product.name} className="flex flex-1 flex-col rounded-[20px] outline-none">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] bg-gradient-to-br from-[#ffe1ef] to-[#ffeccb]">
          {img ? (
            <img
              src={img}
              alt={product.media[0]?.alt ?? product.name}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={cn('h-full w-full object-cover', !product.inStock && 'opacity-50 grayscale')}
            />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-6xl font-extrabold text-[var(--sf-primary)]/40">
              {product.name.charAt(0)}
            </div>
          )}
          {pct > 0 && discounted && (
            <span className="absolute -left-1 top-1 flex h-14 w-14 rotate-[-12deg] items-center justify-center" aria-label={`${pct}% off`}>
              <Starburst className="absolute inset-0 h-full w-full drop-shadow" fill="var(--sf-secondary)" />
              <span className="relative text-center font-display text-[13px] font-extrabold leading-none text-white">
                {pct}%<br />OFF
              </span>
            </span>
          )}
          {product.offerBadge && (
            <span className="absolute right-2 top-2 rounded-full bg-[var(--sf-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sf-primary-fg)] shadow">
              {product.offerBadge}
            </span>
          )}
          {!product.inStock && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="-rotate-6 rounded-full bg-[var(--sf-fg)] px-4 py-1.5 font-display text-sm font-bold text-white">Sold out</span>
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col px-2 pb-1 pt-3">
          <h3 className="line-clamp-2 font-display text-[17px] font-bold leading-tight">{product.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            {price.hidden || price.sellingMinor === undefined ? (
              <span className="text-sm font-medium text-[var(--sf-muted-fg)]">Contact shop for price</span>
            ) : (
              <>
                <span className="font-display text-xl font-extrabold text-[var(--sf-primary)]">{formatMoney(price.sellingMinor, shop.currency)}</span>
                {discounted && <s className="text-xs text-[var(--sf-muted-fg)]">{formatMoney(price.mrpMinor!, shop.currency)}</s>}
              </>
            )}
          </div>
          {product.colours.length > 0 && (
            <ul className="mt-2 flex items-center gap-1.5" aria-label="Colours">
              {product.colours.slice(0, 5).map((c) => (
                <li key={c.name}>
                  <span title={c.name} className="block h-5 w-5 rounded-full border-2 border-white shadow ring-1 ring-[var(--sf-border)]" style={{ background: c.hex || 'var(--sf-accent)' }} />
                </li>
              ))}
              {product.colours.length > 5 && <li className="text-xs font-medium text-[var(--sf-muted-fg)]">+{product.colours.length - 5}</li>}
            </ul>
          )}
          {product.inStock && product.lowStock && (
            <p className="mt-2 inline-block self-start rounded-full bg-[var(--sf-secondary)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--sf-secondary)]">Hurry, few left!</p>
          )}
        </div>
      </Link>
      {onQuickAdd && product.inStock && !price.hidden && (
        <button
          type="button"
          onClick={() => onQuickAdd(product)}
          aria-label={`Add ${product.name} to cart`}
          className="mx-1 mb-1 mt-2 inline-flex items-center justify-center gap-1 rounded-[var(--sf-btn-radius)] bg-[var(--sf-accent)] py-2 font-display text-sm font-bold text-[var(--sf-fg)] shadow-[0_3px_0_0_#d99a00] outline-none transition-transform active:translate-y-0.5 active:shadow-none focus-visible:ring-4 focus-visible:ring-[var(--sf-primary)]/50"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      )}
    </motion.article>
  );
}
