import { useState } from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatNumber } from '@/utils/format';
import { Banknote, Store, Users } from 'lucide-react';
import { SectionCard } from '../components/AdminBits';
import { FilterSelect } from '../components/FilterSelect';
import { GmvBarChart, SignupsChart } from '../components/Charts';
import { NearLimitsList } from '../components/PlatformPanels';
import { useAdminAnalytics } from '../hooks/useAdmin';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const q = useAdminAnalytics(days);
  const d = q.data;
  const sum = (rows: { count: number }[] | undefined) => rows?.reduce((a, r) => a + r.count, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Platform growth and revenue concentration."
        actions={
          <FilterSelect
            label="Date range"
            allLabel="Last 30 days"
            className="w-44"
            value={days === 30 ? undefined : String(days)}
            onChange={(v) => setDays(Number(v ?? 30))}
            options={RANGES.filter((r) => r.value !== '30')}
          />
        }
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={`New shops (${days}d)`} icon={Store} loading={q.isLoading} value={formatNumber(sum(d?.signups.shops))} />
            <StatCard label={`New users (${days}d)`} icon={Users} loading={q.isLoading} value={formatNumber(sum(d?.signups.users))} />
            <StatCard label="Platform GMV (all time)" icon={Banknote} loading={q.isLoading} value={d ? formatMoney(d.totals.gmvMinor) : '—'} />
          </div>
          <SectionCard title="Signups over time" description="Daily new shops and users">
            {q.isLoading || !d ? <Skeleton className="h-64 w-full" /> : <SignupsChart shops={d.signups.shops} users={d.signups.users} height={300} />}
          </SectionCard>
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Top shops by GMV" description="All-time, cancelled and rejected orders excluded">
              {q.isLoading || !d ? <Skeleton className="h-64 w-full" /> : d.topShops.length ? <GmvBarChart rows={d.topShops} /> : <p className="py-10 text-center text-sm text-muted-foreground">No orders yet.</p>}
            </SectionCard>
            <SectionCard title="Shops nearing limits">{q.isLoading || !d ? <Skeleton className="h-64 w-full" /> : <NearLimitsList rows={d.shopsNearLimits} />}</SectionCard>
          </div>
        </div>
      )}
    </>
  );
}
