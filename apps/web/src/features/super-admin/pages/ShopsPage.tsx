import { useState } from 'react';
import { Store } from 'lucide-react';
import { SHOP_STATUSES, type ShopStatus } from '@vastra/shared';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { AdminShopListItem } from '@/types/admin';
import { formatDate } from '@/utils/format';
import { SHOP_STATUS_LABELS, toOptions } from '@/utils/labels';
import { UsageBar } from '../components/AdminBits';
import { FilterSelect } from '../components/FilterSelect';
import { ShopDetailSheet } from '../components/ShopDetailSheet';
import { useAdminPlans, useAdminShops } from '../hooks/useAdmin';

const SHOWN_USAGE = ['products', 'storageBytes', 'ordersPerMonth'] as const;

function UsageCell({ shop }: { shop: AdminShopListItem }) {
  const rows = shop.usage.filter((u) => (SHOWN_USAGE as readonly string[]).includes(u.key));
  return (
    <div className="w-56 space-y-1.5">
      {rows.map((u) => (
        <UsageBar key={u.key} compact limitKey={u.key} used={u.used} limit={u.limit} percent={u.percent} />
      ))}
    </div>
  );
}

export default function ShopsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>();
  const [planId, setPlanId] = useState<string>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  const plans = useAdminPlans();
  const shops = useAdminShops({ page, limit: 20, q, status, planId });

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const columns: DataTableColumn<AdminShopListItem>[] = [
    {
      key: 'shop',
      header: 'Shop',
      mobileTitle: true,
      cell: (s) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{s.name}</p>
          <p className="truncate text-xs text-muted-foreground">/{s.slug}</p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      cell: (s) => (s.owner ? <span className="block max-w-48 truncate text-sm">{s.owner.email}</span> : <span className="text-muted-foreground">—</span>),
    },
    { key: 'plan', header: 'Plan', cell: (s) => s.plan?.name ?? <span className="text-muted-foreground">None</span> },
    { key: 'status', header: 'Status', cell: (s) => <StatusBadge type="shop" status={s.status as ShopStatus} /> },
    { key: 'usage', header: 'Usage', hideOnMobile: false, cell: (s) => <UsageCell shop={s} /> },
    { key: 'created', header: 'Joined', className: 'whitespace-nowrap text-muted-foreground', cell: (s) => formatDate(s.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Shops" description="Every tenant on the platform. Select a shop to manage its plan, limits and status." />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput className="sm:w-72" value={q} onChange={reset(setQ)} placeholder="Search name, slug or email" />
        <FilterSelect label="Filter by status" allLabel="All statuses" value={status} onChange={reset(setStatus)} options={toOptions(SHOP_STATUS_LABELS).filter((o) => (SHOP_STATUSES as readonly string[]).includes(o.value))} />
        <FilterSelect label="Filter by plan" allLabel="All plans" value={planId} onChange={reset(setPlanId)} options={(plans.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
      </div>

      <DataTable
        columns={columns}
        data={shops.data?.items}
        rowKey={(s) => s.id}
        loading={shops.isLoading}
        error={shops.isError ? shops.error : undefined}
        onRetry={() => shops.refetch()}
        meta={shops.data?.meta}
        onPageChange={setPage}
        onRowClick={(s) => setSelected(s.id)}
        emptyIcon={Store}
        emptyTitle="No shops found"
        emptyDescription="Try changing the search or filters."
      />

      <ShopDetailSheet shopId={selected} onClose={() => setSelected(null)} />
    </>
  );
}
