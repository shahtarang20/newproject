import { Link } from 'react-router-dom';
import type { CategoryTileProps, SectionHeadingProps } from '../types';

export function SectionHeading({ eyebrow, title, subtitle, align = 'left' }: SectionHeadingProps) {
  return (
    <header className={align === 'center' ? 'mx-auto max-w-xl text-center' : 'max-w-xl'}>
      {eyebrow && (
        <p className="mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--sf-accent)]">
          <span aria-hidden className="h-px w-8 bg-[var(--sf-accent)]" />
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl font-light leading-tight tracking-tight md:text-[2.6rem]">{title}</h2>
      {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-[var(--sf-muted-fg)]">{subtitle}</p>}
    </header>
  );
}

export function CategoryTile({ category, shop }: CategoryTileProps) {
  return (
    <Link
      to={`/shop/${shop.slug}/category/${category.slug}`}
      aria-label={`Browse ${category.name}`}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--sf-bg)] rounded-[200px_200px_14px_14px]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[200px_200px_14px_14px] bg-[var(--sf-sage-tint)]">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-6xl italic text-[var(--sf-accent)]/60">
            {category.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2 px-1">
        <h3 className="font-display text-lg">{category.name}</h3>
        {category.productCount !== undefined && (
          <span className="text-xs text-[var(--sf-muted-fg)]">{category.productCount} pieces</span>
        )}
      </div>
    </Link>
  );
}
