import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { MoneyText } from '@/components/common/MoneyText';
import { analyticsApi } from '@/api/endpoints/analytics';
import { queryKeys } from '@/api/queryKeys';
import { formatNumber } from '@/utils/format';
import type { AnalyticsRange, ProductPerformanceRow, ProductSort } from '@/types/insights';
import { PanelBody, pct } from './shared';

function SortHead({ label, field, sort, order, onSort }: { label: string; field: ProductSort; sort: ProductSort; order: 'asc' | 'desc'; onSort: (f: ProductSort) => void }) {
  const active = sort === field;
  const Icon = !active ? ChevronsUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={() => onSort(field)} aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'} className="inline-flex items-center gap-1 hover:text-foreground">
      {label} <Icon className={active ? 'h-3.5 w-3.5 text-foreground' : 'h-3.5 w-3.5 opacity-50'} />
    </button>
  );
}

export function ProductPerformanceTable({ range }: { range: AnalyticsRange }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ProductSort>('revenue');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const params = { range, page, limit: 10, sort, order };
  const q = useQuery({ queryKey: queryKeys.analytics.section('products', params), queryFn: () => analyticsApi.products(params), placeholderData: keepPreviousData });

  const onSort = (f: ProductSort) => {
    if (f === sort) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(f); setOrder('desc'); }
    setPage(1);
  };
  const head = (label: string, field: ProductSort) => <SortHead label={label} field={field} sort={sort} order={order} onSort={onSort} />;
  const num = 'text-right tabular-nums';

  const columns: DataTableColumn<ProductPerformanceRow>[] = [
    {
      key: 'name', header: 'Product', mobileTitle: true,
      cell: (r) => (
        <Link to={`/dashboard/products/${r.productId}`} className="flex items-center gap-2.5 hover:underline">
          {r.imageUrl && <img src={r.imageUrl} alt="" loading="lazy" className="h-8 w-8 rounded-md border object-cover" />}
          <span className="truncate font-medium">{r.name}</span>
        </Link>
      ),
    },
    { key: 'views', header: head('Views', 'views'), headerClassName: 'text-right', className: num, cell: (r) => formatNumber(r.views) },
    { key: 'cart', header: head('Add to cart', 'addToCart'), headerClassName: 'text-right', className: num, cell: (r) => formatNumber(r.addToCart) },
    { key: 'orders', header: head('Orders', 'orders'), headerClassName: 'text-right', className: num, cell: (r) => formatNumber(r.orders) },
    { key: 'conv', header: 'Conv.', headerClassName: 'text-right', className: num, cell: (r) => pct(r.conversionPercent) },
    { key: 'rev', header: head('Revenue', 'revenue'), headerClassName: 'text-right', className: num, cell: (r) => <MoneyText minor={r.revenueMinor} /> },
  ];

  return (
    <PanelBody loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} feature="Product performance" height={320}>
      <DataTable
        columns={columns}
        data={q.data?.items}
        rowKey={(r) => r.productId}
        meta={q.data?.meta}
        onPageChange={setPage}
        emptyTitle="No product activity yet"
        emptyDescription="Views and orders will appear once customers browse your shop."
      />
    </PanelBody>
  );
}
