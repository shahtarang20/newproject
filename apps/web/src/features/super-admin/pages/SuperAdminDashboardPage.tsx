import { Banknote, Boxes, CircleDollarSign, ShoppingBag, Store, TrendingUp, UserCheck, Users } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatNumber } from '@/utils/format';
import { SectionCard } from '../components/AdminBits';
import { SignupsChart } from '../components/Charts';
import { NearLimitsList, TopShopsList } from '../components/PlatformPanels';
import { useAdminAnalytics } from '../hooks/useAdmin';

export default function SuperAdminDashboardPage() {
  const q = useAdminAnalytics(30);
  const d = q.data;
  const t = d?.totals;
  const loading = q.isLoading;

  return (
    <>
      <PageHeader title="Platform overview" description="Health of the whole Vastra platform at a glance." />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Shops" icon={Store} loading={loading} value={t ? formatNumber(t.shops) : '—'} />
            <StatCard label="Active shops" icon={UserCheck} loading={loading} value={t ? `${formatNumber(t.activeShops)}${t.suspendedShops ? ` · ${t.suspendedShops} suspended` : ''}` : '—'} />
            <StatCard label="Users" icon={Users} loading={loading} value={t ? formatNumber(t.users) : '—'} />
            <StatCard label="Products" icon={Boxes} loading={loading} value={t ? formatNumber(t.products) : '—'} />
            <StatCard label="Orders" icon={ShoppingBag} loading={loading} value={t ? formatNumber(t.orders) : '—'} />
            <StatCard label="GMV" icon={Banknote} loading={loading} value={t ? formatMoney(t.gmvMinor) : '—'} />
            <StatCard label="MRR (estimate)" icon={CircleDollarSign} loading={loading} value={t ? formatMoney(t.mrrMinor) : '—'} />
            <StatCard label="Paying shops" icon={TrendingUp} loading={loading} value={t ? formatNumber(t.payingShops) : '—'} />
          </div>

          <SectionCard title="Signups" description={`New shops and users per day, last ${d?.rangeDays ?? 30} days`}>
            {loading || !d ? <Skeleton className="h-64 w-full" /> : <SignupsChart shops={d.signups.shops} users={d.signups.users} />}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Top shops" description="By gross merchandise value (cancelled and rejected excluded)">
              {loading || !d ? <Skeleton className="h-56 w-full" /> : <TopShopsList rows={d.topShops} />}
            </SectionCard>
            <SectionCard title="Shops nearing limits" description="Using 80% or more of a plan limit: upsell or raise an override">
              {loading || !d ? <Skeleton className="h-56 w-full" /> : <NearLimitsList rows={d.shopsNearLimits} />}
            </SectionCard>
          </div>
        </div>
      )}
    </>
  );
}
