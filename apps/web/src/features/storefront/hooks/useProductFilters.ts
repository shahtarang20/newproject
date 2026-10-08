import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PublicProductsQuery } from '@/types/storefront';

export const PAGE_SIZE = 12;

export interface FilterState {
  q: string;
  category?: string;
  colour: string[];
  size: string[];
  fabric: string[];
  brand: string[];
  occasion: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  onOffer: boolean;
  sort: NonNullable<PublicProductsQuery['sort']>;
  page: number;
}

const LIST_KEYS = ['colour', 'size', 'fabric', 'brand', 'occasion'] as const;
const SORTS = ['newest', 'price_asc', 'price_desc', 'popular', 'discount'] as const;
const num = (v: string | null) => {
  if (v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Filters live in the URL so listings are shareable and the back button works. */
export function useProductFilters(preset: { category?: string; catalogue?: string } = {}) {
  const [sp, setSp] = useSearchParams();

  const filters = useMemo<FilterState>(() => {
    const sort = sp.get('sort');
    return {
      q: sp.get('q') ?? '',
      category: sp.get('category') || undefined,
      colour: sp.getAll('colour'),
      size: sp.getAll('size'),
      fabric: sp.getAll('fabric'),
      brand: sp.getAll('brand'),
      occasion: sp.getAll('occasion'),
      minPrice: num(sp.get('minPrice')),
      maxPrice: num(sp.get('maxPrice')),
      inStock: sp.get('inStock') === '1',
      onOffer: sp.get('onOffer') === '1',
      sort: (SORTS as readonly string[]).includes(sort ?? '') ? (sort as FilterState['sort']) : 'newest',
      page: Math.max(1, Math.floor(num(sp.get('page')) ?? 1)),
    };
  }, [sp]);

  const query = useMemo<PublicProductsQuery>(
    () => ({
      q: filters.q || undefined,
      category: preset.category ?? filters.category,
      catalogue: preset.catalogue,
      colour: filters.colour.length ? filters.colour : undefined,
      size: filters.size.length ? filters.size : undefined,
      fabric: filters.fabric.length ? filters.fabric : undefined,
      brand: filters.brand.length ? filters.brand : undefined,
      occasion: filters.occasion.length ? filters.occasion : undefined,
      minPrice: filters.minPrice !== undefined ? filters.minPrice * 100 : undefined,
      maxPrice: filters.maxPrice !== undefined ? filters.maxPrice * 100 : undefined,
      inStock: filters.inStock || undefined,
      onOffer: filters.onOffer || undefined,
      sort: filters.sort,
      page: filters.page,
      limit: PAGE_SIZE,
    }),
    [filters, preset.category, preset.catalogue],
  );

  /** Patch filters (resets to page 1 unless `page` is part of the patch). Prices in major units. */
  const update = useCallback(
    (patch: Partial<FilterState>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          const set = (k: string, v: string | undefined) => (v === undefined || v === '' ? next.delete(k) : next.set(k, v));
          if ('q' in patch) set('q', patch.q?.trim());
          if ('category' in patch) set('category', patch.category);
          for (const k of LIST_KEYS) {
            if (k in patch) {
              next.delete(k);
              (patch[k] ?? []).forEach((v) => next.append(k, v));
            }
          }
          if ('minPrice' in patch) set('minPrice', patch.minPrice?.toString());
          if ('maxPrice' in patch) set('maxPrice', patch.maxPrice?.toString());
          if ('inStock' in patch) set('inStock', patch.inStock ? '1' : undefined);
          if ('onOffer' in patch) set('onOffer', patch.onOffer ? '1' : undefined);
          if ('sort' in patch) set('sort', patch.sort && patch.sort !== 'newest' ? patch.sort : undefined);
          if ('page' in patch) set('page', patch.page && patch.page > 1 ? String(patch.page) : undefined);
          else next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  const clear = useCallback(() => {
    setSp((prev) => {
      const next = new URLSearchParams();
      const q = prev.get('q');
      if (q) next.set('q', q);
      const s = prev.get('sort');
      if (s) next.set('sort', s);
      return next;
    }, { replace: true });
  }, [setSp]);

  const activeCount =
    (preset.category ? 0 : filters.category ? 1 : 0) +
    filters.colour.length + filters.size.length + filters.fabric.length + filters.brand.length + filters.occasion.length +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.inStock ? 1 : 0) + (filters.onOffer ? 1 : 0);

  return { filters, query, update, clear, activeCount };
}
