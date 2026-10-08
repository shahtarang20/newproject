import { Link } from 'react-router-dom';
import type { CategoryTileProps, SectionHeadingProps } from '../types';
import { GoldRule } from './Ornaments';
import { GOLD } from './utils';

export function SectionHeading({ eyebrow, title, subtitle, align = 'center' }: SectionHeadingProps) {
  const left = align === 'left';
  return (
    <div className={`mb-8 md:mb-12 ${left ? 'text-left' : 'text-center'}`}>
      {eyebrow && <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[var(--sf-secondary)]">{eyebrow}</p>}
      <h2 className="mt-2 font-display text-2xl font-semibold uppercase tracking-[0.12em] text-[var(--sf-primary)] md:text-4xl">{title}</h2>
      <GoldRule className={`mt-4 max-w-xs ${left ? '' : 'mx-auto'}`} />
      {subtitle && <p className={`mt-4 max-w-xl font-body italic text-[var(--sf-muted-fg)] ${left ? '' : 'mx-auto'}`}>{subtitle}</p>}
    </div>
  );
}

export function CategoryTile({ category, shop }: CategoryTileProps) {
  return (
    <Link to={`/shop/${shop.slug}/category/${category.slug}`} className="group block text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sf-accent)]">
      <div className="mx-auto w-full p-[3px] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transition-none" style={{ background: GOLD }}>
        <div className="relative aspect-[3/4] overflow-hidden bg-[var(--sf-primary)]">
          {category.imageUrl ? (
            <img src={category.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
          ) : (
            <div aria-hidden className="grid h-full w-full place-items-center" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(201,162,74,.14) 12px 13px), linear-gradient(160deg,#0c1b4d,#0b5d4b)' }}>
              <span className="font-display text-5xl text-[var(--sf-accent)]">{category.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1b4d]/80 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="font-display text-base uppercase tracking-[0.18em] text-[#fbf7ee] md:text-lg">{category.name}</h3>
            {category.productCount != null && <p className="mt-1 text-xs italic text-[var(--sf-accent)]">{category.productCount} pieces</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}
