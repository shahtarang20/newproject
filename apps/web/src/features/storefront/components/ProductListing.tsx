import { useEffect, useRef, type ReactNode } from 'react';
import { useStorefront } from '../hooks/useStorefront';
import { useProductFilters } from '../hooks/useProductFilters';
import { useFacetsQuery, useProductsQuery } from '../hooks/useStorefrontApi';
import { useQuickAdd } from '../hooks/useQuickAdd';
import { FilterBar } from './FilterBar';
import { ProductGrid } from './ProductGrid';
import { SearchBar } from './SearchBar';
import { SfButton, SfError } from './ui-sf';

interface Props {
  preset?: { category?: string; catalogue?: string };
  /** hide the category facet (category pages) */
  hideCategory?: boolean;
  hideSearch?: boolean;
  emptyTitle?: string;
}

/** The shared search + filter + sort + paginate engine behind Products / Category / Catalogue pages. */
export function ProductListing({ preset, hideCategory, hideSearch, emptyTitle }: Props): ReactNode {
  const { shop, shopSlug } = useStorefront();
  const { filters, query, update, clear, activeCount } = useProductFilters(preset);
  const productsQ = useProductsQuery(shopSlug, query);
  const facetsQ = useFacetsQuery(shopSlug);
  const { onQuickAdd, dialog } = useQuickAdd();
  const top = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [filters.page]);

  const meta = productsQ.data?.meta;

  return (
    <div ref={top} className="scroll-mt-24 space-y-5">
      {!hideSearch && <SearchBar value={filters.q} onChange={(q) => update({ q })} />}
      <FilterBar
        facets={facetsQ.data}
        filters={filters}
        activeCount={activeCount}
        total={meta?.total}
        currency={shop.currency}
        hideCategory={hideCategory}
        onChange={update}
        onClear={clear}
      />
      {productsQ.isError ? (
        <SfError error={productsQ.error} onRetry={() => void productsQ.refetch()} />
      ) : (
        <ProductGrid
          products={productsQ.data?.data}
          meta={meta}
          shop={shop}
          isLoading={productsQ.isPending}
          isFetching={productsQ.isFetching}
          onPageChange={(page) => update({ page })}
          onQuickAdd={onQuickAdd}
          emptyTitle={filters.q ? `No results for “${filters.q}”` : emptyTitle}
          emptyAction={
            activeCount > 0 || filters.q ? (
              <SfButton variant="outline" onClick={clear}>
                Clear filters
              </SfButton>
            ) : undefined
          }
        />
      )}
      {dialog}
    </div>
  );
}
