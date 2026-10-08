import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { CategoryTileProps, SectionHeadingProps } from '../types';
import { HatchFallback, MONO } from './lib';

export function SectionHeading({ eyebrow, title, subtitle, align = 'left' }: SectionHeadingProps) {
  return (
    <header className={`mb-6 border-t border-[color:var(--sf-fg)] pt-3 md:mb-10 ${align === 'center' ? 'text-center' : ''}`}>
      {eyebrow && <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--sf-muted-fg)]" style={MONO}>— {eyebrow}</p>}
      <h2 className="mt-2 font-display text-4xl font-bold uppercase leading-[0.95] tracking-[-0.04em] md:text-7xl">{title}</h2>
      {subtitle && <p className={`mt-3 max-w-md text-sm text-[color:var(--sf-muted-fg)] ${align === 'center' ? 'mx-auto' : ''}`}>{subtitle}</p>}
    </header>
  );
}

export function CategoryTile({ category, shop }: CategoryTileProps) {
  return (
    <Link
      to={`/shop/${shop.slug}/category/${category.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden border border-[color:var(--sf-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-fg)]"
    >
      {category.imageUrl ? (
        <img src={category.imageUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:scale-[1.03] group-hover:grayscale-0 motion-reduce:transition-none" />
      ) : (
        <HatchFallback className="absolute inset-0" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-[color:var(--sf-bg)] px-3 py-2.5">
        <span className="font-display text-lg font-bold uppercase tracking-tight">{category.name}</span>
        <span className="flex items-center gap-1 text-[10px] tracking-widest" style={MONO}>
          {category.productCount ?? ''}
          <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
