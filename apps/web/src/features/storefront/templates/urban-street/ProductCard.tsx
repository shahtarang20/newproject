import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { ProductCardProps } from '../types';

const NEW_MS = 14 * 24 * 3600 * 1000;

export function ProductCard({ product: p, shop, onQuickAdd, priority }: ProductCardProps) {
  const sold = !p.inStock;
  const isNew = Date.now() - new Date(p.createdAt).getTime() < NEW_MS;
  const { price } = p;
  const img = p.primaryImageUrl ?? p.primaryThumbUrl ?? p.media[0]?.url;
  const href = `/shop/${shop.slug}/product/${p.slug}`;
  return (
    <article className="group relative">
      <div className="relative border-2 border-[var(--sf-border)] bg-[var(--sf-card)] transition duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:border-[var(--sf-primary)] group-hover:shadow-[4px_4px_0_var(--sf-primary)] group-focus-within:-translate-x-1 group-focus-within:-translate-y-1 group-focus-within:shadow-[4px_4px_0_var(--sf-primary)] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0">
        <Link to={href} aria-label={p.name} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-primary)]">
          <div className="relative aspect-[4/5] overflow-hidden bg-[var(--sf-muted)]">
            {img ? (
              <img
                src={img}
                alt={p.media[0]?.alt ?? p.name}
                width={640}
                height={800}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className={cn('h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none', sold && 'opacity-40 grayscale')}
              />
            ) : (
              <div className="grid h-full w-full place-items-center font-display text-6xl uppercase text-[var(--sf-border)]">{p.name.slice(0, 2)}</div>
            )}
            <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
              {price.discountPercent ? (
                <span className="-rotate-3 bg-[var(--sf-accent)] px-2 py-0.5 font-display text-sm uppercase text-black">-{price.discountPercent}%</span>
              ) : null}
              {isNew && !sold && <span className="rotate-2 bg-[var(--sf-primary)] px-2 py-0.5 font-display text-xs uppercase text-[var(--sf-primary-fg)]">New</span>}
              {p.offerBadge && <span className="max-w-[9rem] truncate border-2 border-[var(--sf-fg)] bg-[var(--sf-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{p.offerBadge}</span>}
            </div>
            {sold && (
              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 -rotate-6 bg-[var(--sf-fg)] py-1 text-center font-display text-xl uppercase tracking-widest text-[var(--sf-bg)]">Sold out</span>
            )}
          </div>
          <div className="space-y-1.5 border-t-2 border-[var(--sf-border)] p-3">
            <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-base uppercase leading-tight tracking-wide md:text-lg">{p.name}</h3>
            {price.hidden || price.sellingMinor == null ? (
              <p className="text-sm text-[var(--sf-muted-fg)]">Contact shop for price</p>
            ) : (
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-base font-bold text-[var(--sf-primary)]">{formatMoney(price.sellingMinor, shop.currency)}</span>
                {price.mrpMinor && price.mrpMinor > price.sellingMinor && (
                  <s className="text-xs text-[var(--sf-muted-fg)]">{formatMoney(price.mrpMinor, shop.currency)}</s>
                )}
              </p>
            )}
            <div className="flex min-h-4 items-center justify-between gap-2">
              <ul className="flex items-center gap-1" aria-label="Colours">
                {p.colours.slice(0, 5).map((c) => (
                  <li key={c.name} title={c.name} className="h-3.5 w-3.5 border border-[var(--sf-fg)]/60" style={{ background: c.hex ?? 'var(--sf-muted-fg)' }}>
                    <span className="sr-only">{c.name}</span>
                  </li>
                ))}
                {p.colours.length > 5 && <li className="text-[10px] text-[var(--sf-muted-fg)]">+{p.colours.length - 5}</li>}
              </ul>
              {p.lowStock && !sold && <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-accent)]">Few left</span>}
            </div>
          </div>
        </Link>
        {onQuickAdd && !sold && !price.hidden && (
          <button
            type="button"
            aria-label={`Quick add ${p.name}`}
            onClick={() => onQuickAdd(p)}
            className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center border-2 border-[var(--sf-fg)] bg-[var(--sf-primary)] text-[var(--sf-primary-fg)] transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-fg)] rounded-[var(--sf-btn-radius)]"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        )}
      </div>
    </article>
  );
}
