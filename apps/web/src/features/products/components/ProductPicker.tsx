import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { productsApi } from '@/api/endpoints/products';
import { categoriesApi } from '@/api/endpoints/categories';
import { queryKeys } from '@/api/queryKeys';
import type { Category, Product } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';
import { priceRangeText } from '../utils';

export interface ProductPickerProps {
  /** Selected product ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** Called with every product the picker has loaded so the parent can render selected items. */
  onProductsLoaded?: (products: Product[]) => void;
  /** Show the "add all products of a category" shortcut. */
  allowAddByCategory?: boolean;
  /** Single-select mode. */
  single?: boolean;
  max?: number;
  className?: string;
  listClassName?: string;
}

const ALL = '__all__';

function flatten(cats: Category[], depth = 0): { id: string; name: string }[] {
  return cats.flatMap((c) => [{ id: c.id, name: `${'— '.repeat(depth)}${c.name}` }, ...flatten(c.children ?? [], depth + 1)]);
}

/** Reusable searchable multi-select product list with thumbnails. */
export function ProductPicker({ value, onChange, onProductsLoaded, allowAddByCategory, single, max, className, listClassName }: ProductPickerProps) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(ALL);
  const [page, setPage] = useState(1);
  const [addingCat, setAddingCat] = useState(false);
  const params = { page, limit: 12, q: q || undefined, category: category === ALL ? undefined : category, sort: '-createdAt' };

  const products = useQuery({ queryKey: queryKeys.products.list({ picker: true, ...params }), queryFn: () => productsApi.list(params), placeholderData: (p) => p });
  const cats = useQuery({ queryKey: queryKeys.categories.list({ tree: true }), queryFn: () => categoriesApi.list({ tree: true }), staleTime: 60_000 });
  const catOptions = useMemo(() => flatten(cats.data ?? []), [cats.data]);

  useEffect(() => {
    if (products.data?.items.length) onProductsLoaded?.(products.data.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data]);

  const selected = new Set(value);
  const toggle = (id: string) => {
    if (single) return onChange(selected.has(id) ? [] : [id]);
    if (selected.has(id)) return onChange(value.filter((v) => v !== id));
    if (max && value.length >= max) return toast.warning(`You can pick up to ${max} products.`);
    onChange([...value, id]);
  };

  const addCategory = async () => {
    if (category === ALL) return;
    setAddingCat(true);
    try {
      const res = await productsApi.list({ category, limit: 100 });
      onProductsLoaded?.(res.items);
      const next = [...value];
      for (const p of res.items) if (!selected.has(p.id) && p.status !== 'ARCHIVED') next.push(p.id);
      const finalIds = max ? next.slice(0, max) : next;
      toast.success(`Added ${finalIds.length - value.length} products`);
      onChange(finalIds);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setAddingCat(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search products…" className="flex-1" />
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="sm:w-48" aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {catOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {allowAddByCategory && !single && (
          <Button type="button" variant="outline" disabled={category === ALL} loading={addingCat} onClick={addCategory}>
            <Plus className="h-4 w-4" /> Add category
          </Button>
        )}
      </div>

      {products.isError ? (
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      ) : products.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : !products.data?.items.length ? (
        <EmptyState compact icon={Package} title="No products found" description="Try a different search or category." />
      ) : (
        <ul className={cn('space-y-2', listClassName)}>
          {products.data.items.map((p) => {
            const on = selected.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className={cn('flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors hover:bg-secondary/60', on && 'border-primary bg-accent/40')}
                >
                  {!single && <Checkbox checked={on} tabIndex={-1} aria-hidden className="pointer-events-none" />}
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.primaryThumbUrl && <img src={p.primaryThumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.sku} · {priceRangeText(p)}</span>
                  </span>
                  <StatusBadge type="product" status={p.status} className="hidden sm:inline-flex" />
                  {single && on && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {products.data?.meta && <Pagination meta={products.data.meta} onPageChange={setPage} />}
    </div>
  );
}
