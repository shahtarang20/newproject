import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { StorefrontFacets } from '@/types/storefront';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { FilterState } from '../hooks/useProductFilters';
import { FilterSheet } from './FilterSheet';
import { SfSelect, sfButtonClass, sfFocusRing } from './ui-sf';
import { humanize } from './lib';

interface Props {
  facets?: StorefrontFacets;
  filters: FilterState;
  activeCount: number;
  total?: number;
  currency: string;
  hideCategory?: boolean;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}

const SORTS: { value: FilterState['sort']; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Biggest discount' },
];

export function FilterBar({ facets, filters, activeCount, total, currency, hideCategory, onChange, onClear }: Props) {
  const [open, setOpen] = useState(false);

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (!hideCategory && filters.category) {
    const name = facets?.categories.find((c) => c.slug === filters.category)?.name ?? humanize(filters.category);
    chips.push({ key: 'cat', label: name, remove: () => onChange({ category: undefined }) });
  }
  (['colour', 'size', 'fabric', 'brand', 'occasion'] as const).forEach((k) =>
    filters[k].forEach((v) => chips.push({ key: `${k}-${v}`, label: k === 'colour' || k === 'size' ? v : humanize(v), remove: () => onChange({ [k]: filters[k].filter((x) => x !== v) }) })),
  );
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const a = filters.minPrice !== undefined ? formatMoney(filters.minPrice * 100, currency) : 'Any';
    const b = filters.maxPrice !== undefined ? formatMoney(filters.maxPrice * 100, currency) : 'Any';
    chips.push({ key: 'price', label: `${a} – ${b}`, remove: () => onChange({ minPrice: undefined, maxPrice: undefined }) });
  }
  if (filters.inStock) chips.push({ key: 'stock', label: 'In stock', remove: () => onChange({ inStock: false }) });
  if (filters.onOffer) chips.push({ key: 'offer', label: 'On offer', remove: () => onChange({ onOffer: false }) });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className={sfButtonClass('outline', 'md')} aria-haspopup="dialog">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--sf-primary)] px-1 text-[11px] text-[color:var(--sf-primary-fg)]">{activeCount}</span>
          )}
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="sr-only sm:not-sr-only text-[color:var(--sf-muted-fg)]">Sort</span>
          <SfSelect value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as FilterState['sort'] })} className="w-auto min-w-[10.5rem]" aria-label="Sort products">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SfSelect>
        </label>
      </div>
      {total !== undefined && (
        <p className="text-sm text-[color:var(--sf-muted-fg)]" aria-live="polite">
          {total} {total === 1 ? 'product' : 'products'}
        </p>
      )}
      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={c.remove}
                aria-label={`Remove filter ${c.label}`}
                className={cn('inline-flex items-center gap-1.5 rounded-full bg-[color:var(--sf-muted)] py-1 pl-3 pr-2 text-xs', sfFocusRing)}
              >
                {c.label}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={onClear} className={cn('px-1 text-xs underline underline-offset-4 text-[color:var(--sf-primary)]', sfFocusRing)}>
              Clear all
            </button>
          </li>
        </ul>
      )}
      <FilterSheet open={open} onOpenChange={setOpen} facets={facets} filters={filters} hideCategory={hideCategory} currency={currency} onApply={onChange} onClear={onClear} />
    </div>
  );
}
