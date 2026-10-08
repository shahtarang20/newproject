import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { CategoryTileProps, SectionHeadingProps } from '../types';

export function SectionHeading({ eyebrow, title, subtitle, align = 'center' }: SectionHeadingProps) {
  return (
    <header className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <span className="inline-block rounded-full bg-[var(--sf-accent)] px-4 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--sf-fg)]">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-[var(--sf-fg)] md:text-5xl">{title}</h2>
      <svg aria-hidden viewBox="0 0 120 12" className={`mt-2 h-3 w-28 ${align === 'center' ? 'mx-auto' : ''}`}>
        <path d="M2 6 Q17 -2 32 6 T62 6 T92 6 T118 6" fill="none" stroke="var(--sf-primary)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {subtitle && <p className="mt-3 text-[15px] text-[var(--sf-muted-fg)]">{subtitle}</p>}
    </header>
  );
}

const TINTS = ['#ffd6e7', '#ffe9a8', '#ffd2b0', '#e6d4f5'];

export function CategoryTile({ category, shop }: CategoryTileProps) {
  const tint = TINTS[category.name.length % TINTS.length];
  return (
    <motion.div whileHover={{ y: -6, rotate: -1.5 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
      <Link
        to={`/shop/${shop.slug}/category/${category.slug}`}
        aria-label={`Browse ${category.name}`}
        className="flex flex-col items-center gap-3 rounded-[28px] p-3 text-center outline-none focus-visible:ring-4 focus-visible:ring-[var(--sf-primary)]/50"
        style={{ background: tint }}
      >
        <div className="aspect-square w-full overflow-hidden rounded-[50%_50%_50%_50%/60%_60%_40%_40%] border-4 border-white bg-white shadow-md">
          {category.imageUrl ? (
            <img src={category.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-5xl font-extrabold text-[var(--sf-primary)]">
              {category.name.charAt(0)}
            </div>
          )}
        </div>
        <span className="font-display text-lg font-bold leading-tight text-[var(--sf-fg)]">{category.name}</span>
      </Link>
    </motion.div>
  );
}
