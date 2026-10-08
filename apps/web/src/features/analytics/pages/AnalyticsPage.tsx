import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, Receipt, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { MoneyText } from '@/components/common/MoneyText';
import { analyticsApi } from '@/api/endpoints/analytics';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/hooks';
import { formatNumber } from '@/utils/format';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, labelOf } from '@/utils/labels';
import type { AnalyticsRange, SalesGroupBy } from '@/types/insights';
import { DonutSplit, Panel, PanelBody, RangeSwitcher, TimeSeriesChart, UpgradePrompt, fmtDay, isPlanGated, pct } from '../components/shared';
import { FunnelChart } from '../components/FunnelChart';
import { ProductPerformanceTable } from '../components/ProductPerformanceTable';

const RANGES = ['7d', '30d', '90d', '365d'] as const;
const GROUPS = ['day', 'week', 'month'] as const;

export default function AnalyticsPage() {
  const { shop } = useAuth();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [groupBy, setGroupBy] = useState<SalesGroupBy>('day');
  const cur = shop?.currency ?? 'INR';

  const sales = useQuery({ queryKey: queryKeys.analytics.section('sales', { range, groupBy }), queryFn: () => analyticsApi.sales({ range, groupBy }) });
  const funnel = useQuery({ queryKey: queryKeys.analytics.section('funnel', { range }), queryFn: () => analyticsApi.funnel(range) });
  const s = sales.data;
  const gated = isPlanGated(sales.error);
  const dateFmt = groupBy === 'month' ? (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : fmtDay;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Understand what sells and how customers find you." actions={<RangeSwitcher value={range} onChange={setRange} options={RANGES} />} />

      {gated ? (
        <Panel title="Sales analytics"><UpgradePrompt feature="Sales analytics" /></Panel>
      ) : (
        <>
          <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Revenue" icon={IndianRupee} loading={sales.isLoading} value={<MoneyText minor={s?.totals.revenueMinor} currency={cur} />} delta={s?.totals.revenueDeltaPercent} deltaLabel="vs previous period" />
            <StatCard label="Orders" icon={Receipt} loading={sales.isLoading} value={formatNumber(s?.totals.orders ?? 0)} delta={s?.totals.ordersDeltaPercent} deltaLabel="vs previous period" />
            <StatCard label="Average order value" icon={TrendingUp} loading={sales.isLoading} value={<MoneyText minor={s?.totals.averageOrderValueMinor} currency={cur} />} />
          </section>

          <Panel title="Sales" description="Revenue by period (cancelled and rejected orders excluded)" actions={<RangeSwitcher label="Group by" value={groupBy} onChange={setGroupBy} options={GROUPS} />}>
            <PanelBody loading={sales.isLoading} error={sales.error} onRetry={() => sales.refetch()}>
              <TimeSeriesChart kind="money" label="Revenue" currency={cur} dateFormat={dateFmt} height={300} data={(s?.series ?? []).map((p) => ({ date: p.date, value: p.revenueMinor }))} />
            </PanelBody>
          </Panel>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Payment methods">
              <PanelBody loading={sales.isLoading} error={sales.error} onRetry={() => sales.refetch()} height={200}>
                <DonutSplit label="Payment methods" data={(s?.paymentMethodSplit ?? []).map((m) => ({ name: labelOf(PAYMENT_METHOD_LABELS, m.method), value: m.orders }))} />
              </PanelBody>
            </Panel>
            <Panel title="Order status">
              <PanelBody loading={sales.isLoading} error={sales.error} onRetry={() => sales.refetch()} height={200}>
                <DonutSplit label="Order status" data={(s?.statusSplit ?? []).map((m) => ({ name: labelOf(ORDER_STATUS_LABELS, m.status), value: m.orders }))} />
              </PanelBody>
            </Panel>
          </section>
        </>
      )}

      <Panel title="Conversion funnel" description={`From catalogue visit to order · conversion ${funnel.data ? pct(funnel.data.funnel.at(-1)?.conversionFromStartPercent, 2) : ''}`}>
        <PanelBody loading={funnel.isLoading} error={funnel.error} onRetry={() => funnel.refetch()} feature="The conversion funnel" height={320}>
          {funnel.data && <FunnelChart data={funnel.data} />}
        </PanelBody>
      </Panel>

      <Panel title="Product performance" description="Views, add-to-cart and orders per product">
        <ProductPerformanceTable range={range} />
      </Panel>
    </div>
  );
}
