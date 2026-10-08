import { useState } from 'react';
import { HardDrive, Image as ImageIcon, Store, Video } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import type { StorageItem } from '@/types/admin';
import { formatBytes, formatNumber } from '@/utils/format';
import { SectionCard, UsageBar } from '../components/AdminBits';
import { SimpleBarChart } from '../components/Charts';
import { useAdminStorage } from '../hooks/useAdmin';

export default function StoragePage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const st = useAdminStorage({ page, q });
  const d = st.data;

  const columns: DataTableColumn<StorageItem>[] = [
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
    { key: 'plan', header: 'Plan', cell: (s) => s.plan?.name ?? '—' },
    { key: 'status', header: 'Status', hideOnMobile: true, cell: (s) => <StatusBadge type="shop" status={s.status} /> },
    {
      key: 'usage',
      header: 'Storage used',
      cell: (s) => (
        <div className="w-52">
          <UsageBar limitKey="storageBytes" used={s.usedBytes} limit={s.limitBytes} percent={s.percent} compact label={s.limitBytes === null ? 'Unlimited plan' : `${s.percent}%`} />
        </div>
      ),
    },
    { key: 'images', header: 'Images', className: 'tabular-nums', cell: (s) => formatNumber(s.images) },
    { key: 'videos', header: 'Videos', className: 'tabular-nums', cell: (s) => formatNumber(s.videos) },
  ];

  return (
    <>
      <PageHeader title="Storage" description="Media storage consumed by each shop against its effective limit." />
      <div className="space-y-6">
        {st.isError && !d ? (
          <ErrorState error={st.error} onRetry={() => st.refetch()} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total storage" icon={HardDrive} loading={!d} value={d ? formatBytes(d.totals.usedBytes) : '—'} />
              <StatCard label="Images" icon={ImageIcon} loading={!d} value={d ? formatNumber(d.totals.images) : '—'} />
              <StatCard label="Videos" icon={Video} loading={!d} value={d ? formatNumber(d.totals.videos) : '—'} />
              <StatCard label="Shops" icon={Store} loading={!d} value={d ? formatNumber(d.totals.shops) : '—'} />
            </div>

            <SectionCard title="Top consumers" description="Shops using the most storage">
              {!d ? <Skeleton className="h-64 w-full" /> : d.topConsumers.length ? (
                <SimpleBarChart rows={d.topConsumers.map((c) => ({ name: c.name, value: c.usedBytes }))} valueLabel="Storage used" format={formatBytes} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No storage used yet.</p>
              )}
            </SectionCard>

            <div className="space-y-3">
              <SearchInput className="sm:w-72" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search shops" />
              <DataTable
                columns={columns}
                data={d?.items}
                rowKey={(s) => s.shopId}
                loading={st.isLoading}
                error={st.isError ? st.error : undefined}
                onRetry={() => st.refetch()}
                meta={d?.meta}
                onPageChange={setPage}
                emptyIcon={HardDrive}
                emptyTitle="No shops found"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
