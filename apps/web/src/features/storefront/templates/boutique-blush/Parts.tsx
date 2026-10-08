import { Link } from 'react-router-dom';
import type { CategoryTileProps, SectionHeadingProps } from '../types';
import { BlushFallback, Blossom, SCRIPT } from './lib';

export function SectionHeading({ eyebrow, title, subtitle, align = 'center' }: SectionHeadingProps) {
  const c = align === 'center';
  return (
    <header className={`mb-8 md:mb-12 ${c ? 'text-center' : ''}`}>
      {eyebrow && <p className="text-2xl text-[color:var(--sf-primary)] md:text-3xl" style={SCRIPT}>{eyebrow}</p>}
      <h2 className="font-display text-3xl font-bold leading-tight md:text-5xl">
        {title}
        <Blossom className="ml-2 inline-block h-6 w-6 -translate-y-1 text-[color:var(--sf-primary)] motion-safe:animate-pulse" />
      </h2>
      {subtitle && <p className={`mt-2 max-w-lg text-sm text-[color:var(--sf-muted-fg)] ${c ? 'mx-auto' : ''}`}>{subtitle}</p>}
    </header>
  );
}

export function CategoryTile({ category, shop }: CategoryTileProps) {
  return (
    <Link
      to={`/shop/${shop.slug}/category/${category.slug}`}
      className="group flex flex-col items-center text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--sf-primary)] rounded-[999px]"
    >
      <div className="aspect-square w-full overflow-hidden rounded-full border-4 border-white shadow-[var(--sf-shadow)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-hover:scale-105 group-hover:-rotate-2 motion-reduce:transition-none">
        {category.imageUrl ? (
          <img src={category.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <BlushFallback className="h-full w-full" label={category.name.charAt(0)} />
        )}
      </div>
      <span className="mt-3 rounded-full bg-white/80 px-4 py-1 font-display text-base font-medium italic group-hover:bg-[color:var(--sf-primary)] group-hover:text-[color:var(--sf-primary-fg)]">
        {category.name}
      </span>
    </Link>
  );
}
