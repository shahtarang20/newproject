import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Minus, Package, Plus, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryApi } from '@/api/endpoints/inventory';
import { queryKeys } from '@/api/queryKeys';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { SearchInput } from '@/components/common/SearchInput';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Thumb } from '@/features/orders/components/VariantPicker';
import { usePermission } from '@/hooks';
import { getErrorMessage } from '@/utils/errors';
import { formatNumber } from '@/utils/format';
import type { InventoryItem, StockStatus } from '@/types/commerce';
import { variantText } from '../utils';
import { AdjustStockDialog } from './AdjustStockDialog';

type Filter = 'all' | 'low' | 'out';
const PAGE_SIZE = 20;

export function StatusPill({ status }: { status: StockStatus }) {
  if (status === 'OUT') return <Badge variant="destructive">Out of stock</Badge>;
  if (status === 'LOW') return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="success">In stock</Badge>;
}

export function StockTab({ onViewHistory }: { onViewHistory: (item: InventoryItem) => void }) {
  const { can } = usePermission();
  const qc = useQueryClient();
  const canWrite = can('inventory:write');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);

  const params = { filter, q: q || undefined, page, limit: PAGE_SIZE };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () => inventoryApi.list(params),
    placeholderData: keepPreviousData,
  });

  // Quick +/- is always a real ADJUSTMENT transaction; never a silent edit.
  const quick = useMutation({
    mutationFn: ({ item, delta }: { item: InventoryItem; delta: 1 | -1 }) =>
      inventoryApi.adjust({ variantId: item.variantId, type: 'ADJUSTMENT', quantity: delta, note: 'Quick adjust' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (e) => toast.error(getErrorMessage(e, 'Could not adjust stock.')),
  });

  const s = data?.summary;
  const cards: { key: Filter | 'products' | 'variants' | 'total'; label: string; value?: number; filter?: Filter }[] = [
    { key: 'products', label: 'Products', value: s?.totalProducts },
    { key: 'variants', label: 'Variants', value: s?.totalVariants },
    { key: 'total', label: 'Total units', value: s?.totalStock },
    { key: 'low', label: 'Low stock', value: s?.lowStock, filter: 'low' },
    { key: 'out', label: 'Out of stock', value: s?.outOfStock, filter: 'out' },
  ];

  const stepper = (it: InventoryItem) =>
    canWrite ? (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="outline" size="icon-sm" aria-label="Remove one" disabled={it.stock <= 0 || quick.isPending} onClick={() => quick.mutate({ item: it, delta: -1 })}><Minus className="h-3.5 w-3.5" /></Button>
        <span className="w-9 text-center font-semibold tabular-nums">{it.stock}</span>
        <Button variant="outline" size="icon-sm" aria-label="Add one" disabled={quick.isPending} onClick={() => quick.mutate({ item: it, delta: 1 })}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    ) : <span className="font-semibold tabular-nums">{it.stock}</span>;

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'product', header: 'Product', mobileTitle: true,
      cell: (it) => (
        <div className="flex items-center gap-3">
          <Thumb src={it.imageUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium">{it.productName}</p>
            <p className="truncate text-xs text-muted-foreground">{variantText(it.colour, it.size)}</p>
          </div>
        </div>
      ),
    },
    { key: 'sku', header: 'SKU', cell: (it) => <span className="font-mono text-xs">{it.sku}</span> },
    { key: 'stock', header: 'Stock', cell: stepper },
    { key: 'threshold', header: 'Alert at', cell: (it) => <span className="text-muted-foreground">{it.lowStockThreshold}</span> },
    { key: 'status', header: 'Status', cell: (it) => <StatusPill status={it.status} /> },
    {
      key: 'actions', header: '', className: 'w-px',
      cell: (it) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {canWrite && <Button variant="soft" size="sm" onClick={() => setAdjusting(it)}><SlidersHorizontal className="h-3.5 w-3.5" /> Adjust</Button>}
          <Button variant="ghost" size="icon-sm" aria-label="View history" onClick={() => onViewHistory(it)}><History className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            disabled={!c.filter}
            onClick={() => { if (c.filter) { setFilter(c.filter); setPage(1); } }}
            className="rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default"
          >
            <StatCard label={c.label} value={c.value != null ? formatNumber(c.value) : '-'} loading={isLoading && !s} className={c.filter && filter === c.filter ? 'border-primary' : ''} />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search product, SKU, colour" className="flex-1" />
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:w-72" role="group" aria-label="Stock filter">
          {(['all', 'low', 'out'] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => { setFilter(f); setPage(1); }} aria-pressed={filter === f}
              className={`min-h-9 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-background shadow-soft' : 'text-muted-foreground'}`}>
              {f === 'all' ? 'All' : f === 'low' ? 'Low' : 'Out'}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items}
        rowKey={(it) => it.variantId}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        meta={data?.meta}
        onPageChange={setPage}
        emptyIcon={Package}
        emptyTitle={filter === 'all' && !q ? 'No stock to show' : 'No matching variants'}
        emptyDescription={filter === 'all' && !q ? 'Add products with variants to start tracking stock.' : 'Try a different filter or search.'}
        mobileCard={(it) => (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Thumb src={it.imageUrl} size="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.productName}</p>
                <p className="truncate text-sm text-muted-foreground">{variantText(it.colour, it.size)}</p>
                <p className="font-mono text-xs text-muted-foreground">{it.sku}</p>
              </div>
              <StatusPill status={it.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {canWrite && <Button variant="outline" size="icon" aria-label="Remove one" disabled={it.stock <= 0 || quick.isPending} onClick={() => quick.mutate({ item: it, delta: -1 })}><Minus className="h-4 w-4" /></Button>}
                <span className="w-12 text-center text-xl font-semibold tabular-nums">{it.stock}</span>
                {canWrite && <Button variant="outline" size="icon" aria-label="Add one" disabled={quick.isPending} onClick={() => quick.mutate({ item: it, delta: 1 })}><Plus className="h-4 w-4" /></Button>}
              </div>
              <div className="flex gap-1">
                {canWrite && <Button variant="soft" onClick={() => setAdjusting(it)}>Adjust</Button>}
                <Button variant="ghost" size="icon" aria-label="View history" onClick={() => onViewHistory(it)}><History className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
      />
      {canWrite && <AdjustStockDialog item={adjusting} onOpenChange={(o) => !o && setAdjusting(null)} />}
    </div>
  );
}
