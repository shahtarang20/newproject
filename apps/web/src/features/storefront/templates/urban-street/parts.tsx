import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { CategoryTileProps, SectionHeadingProps } from '../types';

export function SectionHeading({ eyebrow, title, subtitle, align = 'left' }: SectionHeadingProps) {
  const center = align === 'center';
  return (
    <div className={`mb-6 md:mb-8 ${center ? 'text-center' : ''}`}>
      {eyebrow && (
        <span className="mb-2 inline-block -rotate-1 bg-[var(--sf-primary)] px-2 py-0.5 font-display text-xs uppercase tracking-[0.2em] text-[var(--sf-primary-fg)]">{eyebrow}</span>
      )}
      <h2 className="font-display text-4xl uppercase leading-none tracking-tight md:text-6xl">{title}</h2>
      <div className={`mt-3 h-1 w-20 bg-[var(--sf-accent)] ${center ? 'mx-auto' : ''}`} aria-hidden />
      {subtitle && <p className="mt-3 max-w-xl text-sm text-[var(--sf-muted-fg)] md:text-base">{subtitle}</p>}
    </div>
  );
}

export function CategoryTile({ category, shop }: CategoryTileProps) {
  return (
    <Link
      to={`/shop/${shop.slug}/category/${category.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden border-2 border-[var(--sf-border)] bg-[var(--sf-card)] transition hover:border-[var(--sf-primary)] hover:shadow-[4px_4px_0_var(--sf-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-primary)]"
    >
      {category.imageUrl ? (
        <img src={category.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover grayscale transition duration-500 group-hover:scale-110 group-hover:grayscale-0 motion-reduce:transition-none" />
      ) : (
        <div aria-hidden className="h-full w-full" style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 14px, rgba(198,255,61,.1) 14px 16px)' }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <div>
          <h3 className="font-display text-2xl uppercase leading-none md:text-3xl">{category.name}</h3>
          {category.productCount != null && <p className="mt-1 text-xs uppercase tracking-wider text-[var(--sf-primary)]">{category.productCount} pieces</p>}
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center bg-[var(--sf-primary)] text-[var(--sf-primary-fg)] transition-transform group-hover:rotate-45"><ArrowUpRight size={18} /></span>
      </div>
    </Link>
  );
}
