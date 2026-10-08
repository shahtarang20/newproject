import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { ProductCardProps } from '../types';
import { GOLD } from './utils';

export function ProductCard({ product: p, shop, onQuickAdd, priority }: ProductCardProps) {
  const sold = !p.inStock;
  const { price } = p;
  const img = p.primaryImageUrl ?? p.primaryThumbUrl ?? p.media[0]?.url;
  const tag = [p.sareeAttrs?.sareeType, ...(p.sareeAttrs?.workTypes?.slice(0, 1) ?? [])].filter(Boolean).join(' · ') || p.fabric;
  return (
    <article className="group relative">
      <Link to={`/shop/${shop.slug}/product/${p.slug}`} aria-label={p.name} className="block text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sf-accent)]">
        <div className="relative aspect-[3/4] overflow-hidden bg-[var(--sf-muted)] ring-1 ring-[var(--sf-border)] transition group-hover:ring-[var(--sf-accent)]">
          {img ? (
            <img src={img} alt={p.media[0]?.alt ?? p.name} width={600} height={800} loading={priority ? 'eager' : 'lazy'} decoding="async"
              className={cn('h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none', sold && 'opacity-50 grayscale')} />
          ) : (
            <div aria-hidden className="grid h-full w-full place-items-center" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 10px, rgba(201,162,74,.18) 10px 11px), linear-gradient(160deg,#f3ecdc,#e9dcb8)' }}>
              <span className="font-display text-5xl text-[var(--sf-accent)]">{p.name.charAt(0)}</span>
            </div>
          )}
          <span aria-hidden className="absolute inset-1.5 border border-[var(--sf-accent)]/0 transition-colors duration-500 group-hover:border-[var(--sf-accent)]/70" />
          {price.discountPercent ? (
            <span className="absolute left-0 top-3 bg-[var(--sf-secondary)] px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-white">{price.discountPercent}% off</span>
          ) : null}
          {p.offerBadge && <span className="absolute right-0 top-3 bg-[var(--sf-primary)] px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-[var(--sf-accent)]">{p.offerBadge}</span>}
          {sold && <span className="absolute inset-x-0 bottom-0 bg-[var(--sf-primary)]/90 py-2 font-display text-[11px] uppercase tracking-[0.3em] text-[var(--sf-accent)]">Sold out</span>}
        </div>
        <div className="px-1 pt-4">
          {tag && <p className="font-display text-[10px] uppercase tracking-[0.22em] text-[var(--sf-secondary)]">{tag}</p>}
          <h3 className="mt-1 line-clamp-2 min-h-[2.6rem] font-display text-sm uppercase leading-snug tracking-[0.08em] text-[var(--sf-primary)] md:text-[15px]">{p.name}</h3>
          <span aria-hidden className="mx-auto mt-1.5 block h-px w-8 origin-center scale-x-50 opacity-60 transition duration-500 group-hover:w-24 group-hover:scale-x-100 group-hover:opacity-100 motion-reduce:transition-none" style={{ background: GOLD }} />
          {price.hidden || price.sellingMinor == null ? (
            <p className="mt-2 text-sm italic text-[var(--sf-muted-fg)]">Contact shop for price</p>
          ) : (
            <p className="mt-2 flex flex-wrap items-baseline justify-center gap-x-2">
              <span className="text-[15px] font-semibold">{formatMoney(price.sellingMinor, shop.currency)}</span>
              {price.mrpMinor && price.mrpMinor > price.sellingMinor && <s className="text-xs text-[var(--sf-muted-fg)]">{formatMoney(price.mrpMinor, shop.currency)}</s>}
            </p>
          )}
          <div className="mt-2 flex min-h-3 items-center justify-center gap-1.5" aria-label="Colours">
            {p.colours.slice(0, 5).map((c) => (
              <span key={c.name} title={c.name} className="h-3 w-3 rounded-full ring-1 ring-[var(--sf-accent)] ring-offset-1 ring-offset-[var(--sf-bg)]" style={{ background: c.hex ?? 'var(--sf-muted-fg)' }}><span className="sr-only">{c.name}</span></span>
            ))}
          </div>
          {p.lowStock && !sold && <p className="mt-1.5 text-xs italic text-[var(--sf-secondary)]">Only a few pieces remain</p>}
        </div>
      </Link>
      {onQuickAdd && !sold && !price.hidden && (
        <button type="button" aria-label={`Quick add ${p.name}`} onClick={() => onQuickAdd(p)}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-[var(--sf-btn-radius)] bg-[var(--sf-primary)] text-[var(--sf-accent)] opacity-100 shadow transition hover:bg-[var(--sf-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100">
          <Plus size={18} />
        </button>
      )}
    </article>
  );
}
