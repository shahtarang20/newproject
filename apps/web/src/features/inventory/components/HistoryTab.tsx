import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { History, X } from 'lucide-react';
import { INVENTORY_TXN_TYPES, type InventoryTxnType } from '@vastra/shared';
import { inventoryApi } from '@/api/endpoints/inventory';
import { queryKeys } from '@/api/queryKeys';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INVENTORY_TXN_LABELS } from '@/utils/labels';
import { formatDateTime } from '@/utils/format';
import type { InventoryTransaction } from '@/types/commerce';
import { TXN_BADGE, variantText } from '../utils';

export interface VariantFilter { variantId: string; label: string }

export function HistoryTab({ variant, onClearVariant }: { variant: VariantFilter | null; onClearVariant: () => void }) {
  const [type, setType] = useState<'all' | InventoryTxnType>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    variantId: variant?.variantId,
    type: type === 'all' ? undefined : type,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    page,
    limit: 20,
  };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.inventory.transactions(params),
    queryFn: () => inventoryApi.transactions(params),
    placeholderData: keepPreviousData,
  });

  const qty = (t: InventoryTransaction) => (
    <span className={`font-semibold tabular-nums ${t.quantity > 0 ? 'text-success' : 'text-destructive'}`}>{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</span>
  );
  const columns: DataTableColumn<InventoryTransaction>[] = [
    { key: 'date', header: 'When', mobileTitle: true, cell: (t) => <span className="whitespace-nowrap">{formatDateTime(t.createdAt)}</span> },
    {
      key: 'item', header: 'Item',
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{t.productName}</p>
          <p className="truncate text-xs text-muted-foreground">{variantText(t.colour, t.size)}{t.sku ? ` - ${t.sku}` : ''}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', cell: (t) => <Badge variant={TXN_BADGE[t.type]}>{INVENTORY_TXN_LABELS[t.type]}</Badge> },
    { key: 'qty', header: 'Change', cell: qty },
    { key: 'bal', header: 'Balance', cell: (t) => <span className="tabular-nums">{t.balanceAfter}</span> },
    { key: 'note', header: 'Note', cell: (t) => <span className="text-muted-foreground">{t.reason || '-'}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={type} onValueChange={(v) => { setType(v as 'all' | InventoryTxnType); setPage(1); }}>
          <SelectTrigger aria-label="Transaction type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {INVENTORY_TXN_TYPES.map((t) => <SelectItem key={t} value={t}>{INVENTORY_TXN_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" />
        <Input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" />
      </div>
      {variant && (
        <div className="flex items-center gap-2">
          <Badge variant="soft" className="gap-2 py-1 pl-3 pr-1.5">
            {variant.label}
            <button type="button" onClick={onClearVariant} aria-label="Clear variant filter" className="rounded-full p-0.5 hover:bg-background/60"><X className="h-3.5 w-3.5" /></button>
          </Badge>
        </div>
      )}
      <DataTable
        columns={columns}
        data={data?.items}
        rowKey={(t) => t.id}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        meta={data?.meta}
        onPageChange={setPage}
        emptyIcon={History}
        emptyTitle="No stock movements"
        emptyDescription="Every sale, purchase and adjustment shows up here."
      />
    </div>
  );
}
