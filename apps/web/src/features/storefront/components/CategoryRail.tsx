import { Link } from 'react-router-dom';
import type { PublicCategory } from '@/types/storefront';
import { cn } from '@/utils/cn';
import { sfFocusRing } from './ui-sf';

interface Props {
  shopSlug: string;
  categories: PublicCategory[];
  activeSlug?: string;
  className?: string;
}

export function CategoryRail({ shopSlug, categories, activeSlug, className }: Props) {
  if (!categories.length) return null;
  const pill = (active: boolean) =>
    cn(
      'inline-flex min-h-9 shrink-0 items-center rounded-full border px-4 text-sm transition',
      sfFocusRing,
      active
        ? 'border-[color:var(--sf-primary)] bg-[color:var(--sf-primary)] text-[color:var(--sf-primary-fg)]'
        : 'border-[color:var(--sf-border)] bg-[color:var(--sf-card)] hover:border-[color:var(--sf-primary)]',
    );
  return (
    <nav aria-label="Categories" className={cn('-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden', className)}>
      <ul className="flex gap-2">
        <li>
          <Link to={`/shop/${shopSlug}/products`} className={pill(!activeSlug)} aria-current={!activeSlug ? 'page' : undefined}>
            All
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <Link to={`/shop/${shopSlug}/category/${c.slug}`} className={pill(c.slug === activeSlug)} aria-current={c.slug === activeSlug ? 'page' : undefined}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
