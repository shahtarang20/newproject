import { Link } from 'react-router-dom';
import type { CategoryTileProps, SectionHeadingProps } from '../types';
import { Divider, PatternFallback } from './lib';

export function SectionHeading({ eyebrow, title, subtitle, align = 'center' }: SectionHeadingProps) {
  const center = align === 'center';
  return (
    <header className={`mb-8 md:mb-12 ${center ? 'text-center' : 'text-left'}`}>
      {eyebrow && (
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[color:var(--sf-accent)]">{eyebrow}</p>
      )}
      <h2 className="mt-2 font-display text-3xl font-semibold text-[color:var(--sf-primary)] md:text-5xl">{title}</h2>
      <Divider className={`mt-3 h-5 w-48 ${center ? 'mx-auto' : ''}`} />
      {subtitle && (
        <p className={`mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--sf-muted-fg)] ${center ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </header>
  );
}

export function CategoryTile({ category, shop }: CategoryTileProps) {
  return (
    <Link
      to={`/shop/${shop.slug}/category/${category.slug}`}
      className="group block text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--sf-primary)]"
    >
      <div className="mx-auto aspect-[3/4] w-full overflow-hidden rounded-t-[999px] rounded-b-[4px] border border-[color:var(--sf-accent)] p-1.5">
        <div className="h-full w-full overflow-hidden rounded-t-[999px] rounded-b-[2px]">
          {category.imageUrl ? (
            <img
              src={category.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <PatternFallback className="h-full w-full" label={category.name.charAt(0)} />
          )}
        </div>
      </div>
      <h3 className="mt-3 font-display text-xl font-semibold text-[color:var(--sf-primary)] group-hover:underline decoration-[color:var(--sf-accent)] underline-offset-4">
        {category.name}
      </h3>
      {category.productCount != null && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--sf-muted-fg)]">
          {category.productCount} pieces
        </p>
      )}
    </Link>
  );
}
