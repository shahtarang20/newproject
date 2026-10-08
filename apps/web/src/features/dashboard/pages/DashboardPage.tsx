import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Boxes, ExternalLink, IndianRupee, MessageSquare, Package, Plus, Receipt, Share2, ShoppingBag, TrendingUp, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MoneyText } from '@/components/common/MoneyText';
import { ErrorState } from '@/components/common/ErrorState';
import { analyticsApi } from '@/api/endpoints/analytics';
import { queryKeys } from '@/api/queryKeys';
import { useAuth, usePermission } from '@/hooks';
import { formatDateTime, formatNumber } from '@/utils/format';
import type { DashboardRange } from '@/types/insights';
import { Panel, PanelBody, RangeSwitcher, TimeSeriesChart, compactMoney, CHART_COLORS } from '@/features/analytics/components/shared';
import { ShareShopDialog, storefrontUrl } from '../components/ShareShopDialog';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { UsageWarnings } from '../components/UsageWarnings';

const RANGES = ['7d', '30d', '90d'] as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { user, shop } = useAuth();
  const { can } = usePermission();
  const [range, setRange] = useState<DashboardRange>('30d');
  const [shareOpen, setShareOpen] = useState(false);

  const canAnalytics = can('analytics:read');
  const q = useQuery({
    queryKey: queryKeys.analytics.section('dashboard', { range }),
    queryFn: () => analyticsApi.dashboard(range),
    enabled: canAnalytics,
    placeholderData: keepPreviousData,
  });
  const d = q.data;
  const cur = d?.currency ?? shop?.currency ?? 'INR';
  const loading = q.isLoading;
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description={shop?.name ? `Here's how ${shop.name} is doing.` : 'Here is how your shop is doing.'}
        actions={
          <>
            {can('products:write') && (
              <Button asChild size="sm">
                <Link to="/dashboard/products/new"><Plus className="h-4 w-4" /> Add product</Link>
              </Button>
            )}
            {shop?.slug && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4" /> Share shop link
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={storefrontUrl(shop.slug)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> View storefront
                  </a>
                </Button>
              </>
            )}
          </>
        }
      />

      <UsageWarnings />
      <OnboardingChecklist shopId={shop?.id} onShare={() => setShareOpen(true)} />

      {!canAnalytics ? (
        <EmptyState icon={TrendingUp} title="Insights are not available for your role" description="Ask the shop owner for analytics access to see sales and activity." compact />
      ) : q.isError && !d ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Today's sales" icon={IndianRupee} loading={loading} value={<MoneyText minor={d?.todaySalesMinor} currency={cur} />} />
            <StatCard label="Today's orders" icon={ShoppingBag} loading={loading} value={formatNumber(d?.todayOrders ?? 0)} />
            <StatCard label="Pending orders" icon={Receipt} loading={loading} value={formatNumber(d?.pendingOrders ?? 0)} />
            <StatCard label="Customers" icon={Users} loading={loading} value={formatNumber(d?.totalCustomers ?? 0)} />
            <StatCard label="Products" icon={Package} loading={loading} value={formatNumber(d?.productsCount ?? 0)} />
            <StatCard
              label="Low stock"
              icon={AlertTriangle}
              loading={loading}
              value={formatNumber(d?.lowStockCount ?? 0)}
              hint={(d?.outOfStockCount ?? 0) > 0 ? `${formatNumber(d?.outOfStockCount ?? 0)} out of stock` : undefined}
            />
            <StatCard
              className="col-span-2 lg:col-span-2"
              label={`Revenue (${range})`} icon={TrendingUp} loading={loading}
              value={<MoneyText minor={d?.revenue.totalMinor} currency={cur} />}
              delta={d?.revenue.deltaPercent}
              deltaLabel="vs previous period"
            />
          </section>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Performance</h2>
            <RangeSwitcher value={range} onChange={setRange} options={RANGES} />
          </div>
          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Sales over time" description={d ? `${compactMoney(d.revenue.totalMinor)} in ${range}` : undefined}>
              <PanelBody loading={loading}>
                <TimeSeriesChart kind="money" label="Revenue" currency={cur} data={(d?.salesOverTime ?? []).map((p) => ({ date: p.date, value: p.revenueMinor }))} />
              </PanelBody>
            </Panel>
            <Panel title="Orders over time" description={d ? `${formatNumber(d.revenue.orders)} orders in ${range}` : undefined}>
              <PanelBody loading={loading}>
                <TimeSeriesChart kind="count" variant="bar" color={CHART_COLORS[1]} label="Orders" data={(d?.ordersOverTime ?? []).map((p) => ({ date: p.date, value: p.orders }))} />
              </PanelBody>
            </Panel>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Top products">
              {loading ? <ListSkeleton /> : !d?.topProducts.length ? <p className="py-6 text-center text-sm text-muted-foreground">No sales in this period yet.</p> : (
                <ul className="divide-y">
                  {d.topProducts.map((p) => (
                    <li key={p.productId} className="flex items-center gap-3 py-2.5">
                      <Thumb src={p.imageUrl} alt={p.name} />
                      <div className="min-w-0 flex-1">
                        <Link to={`/dashboard/products/${p.productId}`} className="block truncate text-sm font-medium hover:underline">{p.name}</Link>
                        <p className="text-xs text-muted-foreground">{formatNumber(p.quantity)} sold · {formatNumber(p.orders)} orders</p>
                      </div>
                      <MoneyText minor={p.revenueMinor} currency={cur} className="text-sm font-medium" />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Top categories">
              {loading ? <ListSkeleton /> : !d?.topCategories.length ? <p className="py-6 text-center text-sm text-muted-foreground">No category sales yet.</p> : (
                <ul className="space-y-3">
                  {(() => {
                    const max = Math.max(...d.topCategories.map((c) => c.revenueMinor), 1);
                    return d.topCategories.map((c, i) => (
                      <li key={c.categoryId ?? `u${i}`}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span className="truncate">{c.name}</span>
                          <MoneyText minor={c.revenueMinor} currency={cur} className="shrink-0 font-medium" />
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(c.revenueMinor / max) * 100}%` }} />
                        </div>
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </Panel>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Recent orders" actions={can('orders:read') ? <Button asChild variant="ghost" size="sm"><Link to="/dashboard/orders">View all</Link></Button> : undefined}>
              {loading ? <ListSkeleton /> : !d?.recentOrders.length ? <EmptyState compact icon={Receipt} title="No orders yet" description="New orders will show up here." /> : (
                <ul className="divide-y">
                  {d.recentOrders.map((o) => (
                    <li key={o.id}>
                      <Link to={`/dashboard/orders/${o.id}`} className="flex items-center gap-3 py-2.5 hover:bg-muted/40">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">#{o.orderNumber} · {o.customerName}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <MoneyText minor={o.totalMinor} currency={cur} className="text-sm font-medium" />
                          <StatusBadge type="order" status={o.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Recent enquiries" actions={can('enquiries:read') ? <Button asChild variant="ghost" size="sm"><Link to="/dashboard/enquiries">View all</Link></Button> : undefined}>
              {loading ? <ListSkeleton /> : !d?.recentEnquiries.length ? <EmptyState compact icon={MessageSquare} title="No enquiries yet" description="Customer questions will appear here." /> : (
                <ul className="divide-y">
                  {d.recentEnquiries.map((e) => (
                    <li key={e.id}>
                      <Link to={`/dashboard/enquiries?open=${e.id}`} className="flex items-center gap-3 py-2.5 hover:bg-muted/40">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{e.message}</p>
                        </div>
                        <StatusBadge type="enquiry" status={e.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>
        </>
      )}

      {shop?.slug && <ShareShopDialog open={shareOpen} onOpenChange={setShareOpen} slug={shop.slug} shopId={shop.id} shopName={shop.name} />}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

function Thumb({ src, alt }: { src?: string; alt: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className="h-10 w-10 shrink-0 rounded-lg border object-cover" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Boxes className="h-4 w-4" /></span>
  );
}
