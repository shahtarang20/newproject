import { useState } from 'react';
import { Check, ExternalLink, Layers, Pause, Play, X } from 'lucide-react';
import { FEATURE_KEYS } from '@vastra/shared';
import { adminApi } from '@/api/endpoints/admin';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime, formatNumber } from '@/utils/format';
import { BUSINESS_TYPE_LABELS, labelOf } from '@/utils/labels';
import { useAdminMutation, useAdminShop } from '../hooks/useAdmin';
import { FEATURE_TITLES, UsageBar } from './AdminBits';
import { LimitOverridesEditor } from './LimitOverridesEditor';
import { AssignPlanDialog, SuspendShopDialog } from './ShopDialogs';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  );
}

export function ShopDetailSheet({ shopId, onClose }: { shopId: string | null; onClose: () => void }) {
  const q = useAdminShop(shopId);
  const confirm = useConfirm();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const activate = useAdminMutation(() => adminApi.setShopStatus(shopId as string, { status: 'ACTIVE' }), { success: 'Shop activated' });
  const d = q.data;

  const onActivate = async () => {
    if (await confirm({ title: `Activate ${d?.shop.name}?`, description: 'The storefront goes live again and the owner is notified.', confirmText: 'Activate' })) activate.mutate(undefined);
  };

  return (
    <Sheet open={!!shopId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-none overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{d?.shop.name ?? 'Shop details'}</SheetTitle>
          <SheetDescription>{d ? `/shop/${d.shop.slug}` : 'Loading…'}</SheetDescription>
        </SheetHeader>

        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !d ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge type="shop" status={d.shop.status} />
              {d.subscription && <StatusBadge type="subscription" status={d.subscription.status} />}
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/shop/${d.shop.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Open storefront
                  </a>
                </Button>
                {d.shop.status === 'SUSPENDED' ? (
                  <Button size="sm" loading={activate.isPending} onClick={() => void onActivate()}>
                    <Play className="h-3.5 w-3.5" /> Activate
                  </Button>
                ) : (
                  <Button variant="destructive" size="sm" onClick={() => setSuspendOpen(true)}>
                    <Pause className="h-3.5 w-3.5" /> Suspend
                  </Button>
                )}
              </div>
            </div>

            <section>
              <h3 className="mb-1 text-sm font-semibold">Profile</h3>
              <dl className="divide-y">
                <Row label="Business type">{d.shop.businessType ? labelOf(BUSINESS_TYPE_LABELS, d.shop.businessType) : '—'}</Row>
                <Row label="Created">{d.shop.createdAt ? formatDate(d.shop.createdAt) : '—'}</Row>
                <Row label="Contact email">{d.shop.contact?.email ?? '—'}</Row>
                <Row label="Contact phone">{d.shop.contact?.phone ?? '—'}</Row>
                <Row label="Products">{formatNumber(d.counts.products)}</Row>
                <Row label="Orders">{formatNumber(d.counts.orders)}</Row>
              </dl>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold">Owner</h3>
              {d.owner ? (
                <dl className="divide-y">
                  <Row label="Name">{d.owner.name}</Row>
                  <Row label="Email">{d.owner.email}</Row>
                  <Row label="Phone">{d.owner.phone ?? '—'}</Row>
                  <Row label="Account">{d.owner.isActive ? 'Active' : 'Deactivated'}</Row>
                  <Row label="Last login">{d.owner.lastLoginAt ? formatDateTime(d.owner.lastLoginAt) : 'Never'}</Row>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No owner found.</p>
              )}
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Subscription</h3>
                <Button variant="outline" size="sm" onClick={() => setPlanOpen(true)}>
                  <Layers className="h-3.5 w-3.5" /> {d.subscription ? 'Change plan' : 'Assign plan'}
                </Button>
              </div>
              {d.subscription ? (
                <dl className="divide-y">
                  <Row label="Plan">{d.subscription.plan?.name ?? '—'}</Row>
                  <Row label="Interval">{d.subscription.interval === 'YEARLY' ? 'Yearly' : 'Monthly'}</Row>
                  <Row label="Period ends">{d.subscription.currentPeriodEnd ? formatDate(d.subscription.currentPeriodEnd) : 'No expiry'}</Row>
                  {d.subscription.trialEndsAt && <Row label="Trial ends">{formatDate(d.subscription.trialEndsAt)}</Row>}
                  {d.subscription.cancelAtPeriodEnd && <Row label="Cancels">At period end</Row>}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No subscription.</p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Usage vs effective limits</h3>
              <div className="space-y-3">
                {d.usage.map((u) => (
                  <UsageBar key={u.key} limitKey={u.key} used={u.used} limit={u.limit} percent={u.percent} />
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Limit overrides</h3>
              <LimitOverridesEditor detail={d} />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Features (from plan)</h3>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {FEATURE_KEYS.map((k) => (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    {d.features[k] ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-muted-foreground" />}
                    <span className={d.features[k] ? '' : 'text-muted-foreground'}>{FEATURE_TITLES[k]?.title ?? k}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Features are controlled by the plan; per-shop feature overrides are not supported by the API.</p>
            </section>

            <SuspendShopDialog open={suspendOpen} onOpenChange={setSuspendOpen} shopId={d.shop.id} shopName={d.shop.name} />
            <AssignPlanDialog open={planOpen} onOpenChange={setPlanOpen} detail={d} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
