import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Check, Info, X } from 'lucide-react';
import { FEATURE_KEYS, type BillingInterval } from '@vastra/shared';
import { subscriptionApi } from '@/api/endpoints/subscription';
import { queryKeys } from '@/api/queryKeys';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { usePermission } from '@/hooks/usePermission';
import { formatDate, formatMoney } from '@/utils/format';
import { SUBSCRIPTION_STATUS_LABELS } from '@/utils/labels';
import { pageTitle } from '@/utils/seo';
import { cn } from '@/utils/cn';
import type { PlanDto, SubscriptionDto } from '@/types/settings';
import { DowngradeBlockedDialog } from '../components/DowngradeBlockedDialog';
import { PlanCard } from '../components/PlanCard';
import { UsageMeters } from '../components/UsageMeters';
import { usePlanChange } from '../hooks/usePlanChange';
import { FEATURE_LABELS } from '../lib';

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success', TRIALING: 'info', PAST_DUE: 'warning', CANCELLED: 'neutral', EXPIRED: 'destructive',
};

function CurrentPlan({ sub }: { sub: SubscriptionDto }) {
  const price = sub.plan.priceMinor[sub.interval];
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Current plan</p>
          <h2 className="mt-0.5 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {sub.plan.name}
            <Badge variant={STATUS_VARIANT[sub.status] ?? 'neutral'}>{SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status}</Badge>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {price === 0 ? 'Free' : `${formatMoney(price, sub.plan.currency)} / ${sub.interval === 'MONTHLY' ? 'month' : 'year'}`}
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="flex items-center justify-end gap-1.5"><CalendarClock className="h-4 w-4" />
            {sub.currentPeriodEnd ? `${sub.cancelAtPeriodEnd ? 'Ends' : 'Renews / expires'} ${formatDate(sub.currentPeriodEnd)}` : 'No end date'}
          </p>
          <p className="text-xs">Period started {formatDate(sub.currentPeriodStart)}</p>
          {sub.trialDaysLeft != null && sub.status === 'TRIALING' && <p className="mt-1 font-medium text-info">{sub.trialDaysLeft} trial day{sub.trialDaysLeft === 1 ? '' : 's'} left</p>}
        </div>
      </div>
      {sub.status === 'PAST_DUE' && (
        <p className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
          Your plan period has ended{sub.graceEndsAt ? `; features stay available until ${formatDate(sub.graceEndsAt)}` : ''}. Choose a plan below to continue.
        </p>
      )}
      {sub.status === 'EXPIRED' && <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">Your plan has expired. Choose a plan below to restore full access.</p>}
      {sub.pendingChange && (
        <p className="mt-4 flex gap-2 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          A plan change started on {formatDate(sub.pendingChange.createdAt)} was never paid for, so nothing changed. Starting a new change replaces it.
        </p>
      )}
      <ul className="mt-5 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {FEATURE_KEYS.map((k) => (
          <li key={k} className={cn('flex items-center gap-2', !sub.features[k] && 'text-muted-foreground/70')}>
            {sub.features[k] ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4" />}
            {FEATURE_LABELS[k]}{!sub.features[k] && <span className="text-xs">(not in plan)</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function SubscriptionPage() {
  const { can } = usePermission();
  const canManage = can('subscription:manage');
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const subQ = useQuery({ queryKey: queryKeys.subscription.current(), queryFn: subscriptionApi.current });
  const plansQ = useQuery({ queryKey: queryKeys.subscription.plans(), queryFn: subscriptionApi.plans, staleTime: 5 * 60_000 });
  const { change, busyPlanId, exceeded, clearExceeded } = usePlanChange();

  const sub = subQ.data;
  const plans = [...(plansQ.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentPrice = sub ? sub.plan.priceMinor[interval] : 0;

  const choose = async (plan: PlanDto) => {
    const price = plan.priceMinor[interval];
    const down = price < currentPrice;
    const ok = await confirm({
      title: `${down ? 'Downgrade' : price === 0 ? 'Switch' : 'Upgrade'} to ${plan.name}?`,
      description: price === 0
        ? `You'll move to the ${plan.name} plan right away. Features and limits change immediately.`
        : `You'll pay ${formatMoney(price, plan.currency)} ${interval === 'MONTHLY' ? 'per month' : 'per year'} through a secure checkout. Your plan only changes after the payment is confirmed. Each period is a one-off payment, not an auto-renewing subscription.`,
      confirmText: price === 0 ? 'Switch plan' : 'Continue to payment',
    });
    if (ok) await change(plan, interval, { name: user?.name, email: user?.email, contact: user?.phone });
  };

  return (
    <>
      <Helmet><title>{pageTitle('Subscription')}</title></Helmet>
      <PageHeader title="Subscription" description="Your plan, usage and available upgrades." />

      {(subQ.isLoading || plansQ.isLoading) && (
        <div className="space-y-4"><Skeleton className="h-52 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      )}
      {subQ.error && !sub && <ErrorState error={subQ.error} onRetry={() => void subQ.refetch()} />}

      {sub && (
        <div className="space-y-6 pb-8">
          <CurrentPlan sub={sub} />

          <section aria-labelledby="usage-h">
            <h2 id="usage-h" className="mb-3 text-base font-semibold tracking-tight">Usage</h2>
            <UsageMeters usage={sub.usage} limits={sub.limits} />
          </section>

          <section aria-labelledby="plans-h">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="plans-h" className="text-base font-semibold tracking-tight">Plans</h2>
              <Tabs value={interval} onValueChange={(v) => setInterval(v as BillingInterval)}>
                <TabsList>
                  <TabsTrigger value="MONTHLY">Monthly</TabsTrigger>
                  <TabsTrigger value="YEARLY">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {!canManage && <p className="mb-3 text-sm text-muted-foreground">Only the shop owner can change the plan.</p>}
            {plansQ.error ? (
              <ErrorState error={plansQ.error} onRetry={() => void plansQ.refetch()} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    interval={interval}
                    isCurrent={p.id === sub.plan.id && interval === sub.interval}
                    currentPrice={currentPrice}
                    busy={busyPlanId === p.id}
                    disabled={!canManage || busyPlanId !== null}
                    onChoose={() => void choose(p)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      <DowngradeBlockedDialog open={!!exceeded} planName={exceeded?.plan.name ?? ''} items={exceeded?.items ?? []} onClose={clearExceeded} />
    </>
  );
}
