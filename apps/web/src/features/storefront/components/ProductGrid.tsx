import { ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import type { PaginationMeta } from '@vastra/shared';
import type { PublicProduct, PublicShop } from '@/types/storefront';
import { cn } from '@/utils/cn';
import { useTemplate } from '../templates/useTemplate';
import { SfEmpty, SfSkeleton, sfButtonClass } from './ui-sf';

interface Props {
  products?: PublicProduct[];
  shop: PublicShop;
  isLoading?: boolean;
  isFetching?: boolean;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onQuickAdd?: (p: PublicProduct) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  /** how many leading cards load eagerly */
  priorityCount?: number;
  skeletonCount?: number;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  const { gridClassName } = useTemplate();
  return (
    <div className={gridClassName} role="status" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SfSkeleton className="aspect-[4/5] w-full" />
          <SfSkeleton className="h-4 w-3/4" />
          <SfSkeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function pageList(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const s = Math.max(2, page - 1);
  const e = Math.min(total - 1, page + 1);
  if (s > 2) out.push('…');
  for (let i = s; i <= e; i++) out.push(i);
  if (e < total - 1) out.push('…');
  out.push(total);
  return out;
}

export function ProductGrid({ products, shop, isLoading, isFetching, meta, onPageChange, onQuickAdd, emptyTitle = 'No products found', emptyDescription = 'Try changing or clearing your filters.', emptyAction, priorityCount = 4, skeletonCount = 8 }: Props) {
  const { gridClassName, ProductCard } = useTemplate();

  if (isLoading) return <ProductGridSkeleton count={skeletonCount} />;
  if (!products || products.length === 0) {
    return <SfEmpty icon={<PackageSearch className="h-9 w-9" />} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const page = meta?.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;
  const pageBtn = 'min-w-10 px-3';

  return (
    <div>
      <div className={cn(gridClassName, 'transition-opacity', isFetching && 'opacity-60')} aria-busy={isFetching || undefined}>
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} shop={shop} onQuickAdd={onQuickAdd} priority={i < priorityCount} />
        ))}
      </div>
      {totalPages > 1 && onPageChange && (
        <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={sfButtonClass('outline', 'sm', pageBtn)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-[color:var(--sf-muted-fg)]" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={sfButtonClass(p === page ? 'primary' : 'outline', 'sm', pageBtn)}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={sfButtonClass('outline', 'sm', pageBtn)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
