import { useEffect, useState } from 'react';
import { CreditCard, Pencil } from 'lucide-react';
import { BILLING_INTERVALS, SUBSCRIPTION_STATUSES, type BillingInterval, type SubscriptionStatus } from '@vastra/shared';
import { adminApi } from '@/api/endpoints/admin';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AdminSubscriptionRow, SubscriptionPatch } from '@/types/admin';
import { formatDate } from '@/utils/format';
import { SUBSCRIPTION_STATUS_LABELS } from '@/utils/labels';
import { FilterSelect } from '../components/FilterSelect';
import { useAdminMutation, useAdminPlans, useAdminSubscriptions } from '../hooks/useAdmin';

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const fromDateInput = (v: string) => (v ? new Date(`${v}T23:59:59.000Z`).toISOString() : null);

function EditSubscriptionDialog({ sub, onClose }: { sub: AdminSubscriptionRow | null; onClose: () => void }) {
  const [status, setStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [interval, setIntervalValue] = useState<BillingInterval>('MONTHLY');
  const [periodEnd, setPeriodEnd] = useState('');
  const [trialEnd, setTrialEnd] = useState('');
  const [cancel, setCancel] = useState(false);

  useEffect(() => {
    if (!sub) return;
    setStatus(sub.storedStatus);
    setIntervalValue(sub.interval);
    setPeriodEnd(toDateInput(sub.currentPeriodEnd));
    setTrialEnd(toDateInput(sub.trialEndsAt));
    setCancel(sub.cancelAtPeriodEnd);
  }, [sub]);

  const save = useAdminMutation((patch: SubscriptionPatch) => adminApi.updateSubscription((sub as AdminSubscriptionRow).id, patch), { success: 'Subscription updated', onSuccess: onClose });

  const submit = () => {
    if (!sub) return;
    const patch: SubscriptionPatch = {};
    if (status !== sub.storedStatus) patch.status = status;
    if (interval !== sub.interval) patch.interval = interval;
    if (periodEnd !== toDateInput(sub.currentPeriodEnd)) patch.currentPeriodEnd = fromDateInput(periodEnd);
    if (trialEnd !== toDateInput(sub.trialEndsAt)) patch.trialEndsAt = fromDateInput(trialEnd);
    if (cancel !== sub.cancelAtPeriodEnd) patch.cancelAtPeriodEnd = cancel;
    if (Object.keys(patch).length === 0) return onClose();
    save.mutate(patch);
  };

  return (
    <Dialog open={!!sub} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit subscription</DialogTitle>
          <DialogDescription>
            {sub?.shop?.name} · {sub?.plan?.name}. To switch plan, use the shop’s “Change plan” action.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SubscriptionStatus)}>
                <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{SUBSCRIPTION_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interval</Label>
              <Select value={interval} onValueChange={(v) => setIntervalValue(v as BillingInterval)}>
                <SelectTrigger aria-label="Interval"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_INTERVALS.map((i) => (
                    <SelectItem key={i} value={i}>{i === 'MONTHLY' ? 'Monthly' : 'Yearly'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-end">Period ends</Label>
              <Input id="sub-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-trial">Trial ends</Label>
              <Input id="sub-trial" type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">Clear a date to remove it (no expiry).</p>
          <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <span className="text-sm font-medium">Cancel at period end</span>
            <Switch checked={cancel} onCheckedChange={setCancel} aria-label="Cancel at period end" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SubscriptionsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>();
  const [planId, setPlanId] = useState<string>();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminSubscriptionRow | null>(null);
  const plans = useAdminPlans();
  const subs = useAdminSubscriptions({ page, limit: 20, q, status, planId });

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const columns: DataTableColumn<AdminSubscriptionRow>[] = [
    {
      key: 'shop',
      header: 'Shop',
      mobileTitle: true,
      cell: (s) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{s.shop?.name ?? 'Deleted shop'}</p>
          <p className="truncate text-xs text-muted-foreground">{s.shop ? `/${s.shop.slug}` : ''}</p>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', cell: (s) => s.plan?.name ?? '—' },
    { key: 'status', header: 'Status', cell: (s) => <StatusBadge type="subscription" status={s.status} /> },
    { key: 'interval', header: 'Interval', cell: (s) => (s.interval === 'YEARLY' ? 'Yearly' : 'Monthly') },
    {
      key: 'period',
      header: 'Current period',
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (s) => `${formatDate(s.currentPeriodStart)} → ${s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : 'No expiry'}`,
    },
    { key: 'trial', header: 'Trial ends', hideOnMobile: true, className: 'whitespace-nowrap text-muted-foreground', cell: (s) => (s.trialEndsAt ? formatDate(s.trialEndsAt) : '—') },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-right',
      cell: (s) => (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setEditing(s); }}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Subscriptions" description="Billing state of every shop. Status shown is the effective status (grace and expiry applied)." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput className="sm:w-72" value={q} onChange={reset(setQ)} placeholder="Search shop" />
        <FilterSelect label="Filter by status" allLabel="All statuses" value={status} onChange={reset(setStatus)} options={SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: SUBSCRIPTION_STATUS_LABELS[s] }))} />
        <FilterSelect label="Filter by plan" allLabel="All plans" value={planId} onChange={reset(setPlanId)} options={(plans.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
      </div>
      <DataTable
        columns={columns}
        data={subs.data?.items}
        rowKey={(s) => s.id}
        loading={subs.isLoading}
        error={subs.isError ? subs.error : undefined}
        onRetry={() => subs.refetch()}
        meta={subs.data?.meta}
        onPageChange={setPage}
        emptyIcon={CreditCard}
        emptyTitle="No subscriptions found"
        emptyDescription="Try changing the search or filters."
      />
      <EditSubscriptionDialog sub={editing} onClose={() => setEditing(null)} />
    </>
  );
}
