import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { BILLING_INTERVALS, SUBSCRIPTION_STATUSES, type BillingInterval, type SubscriptionStatus } from '@vastra/shared';
import { adminApi } from '@/api/endpoints/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormError } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { AdminShopDetail } from '@/types/admin';
import { LIMIT_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/utils/labels';
import { formatMoney } from '@/utils/format';
import { useAdminMutation, useAdminPlans } from '../hooks/useAdmin';

const reasonSchema = z.object({ reason: z.string().trim().min(3, 'Please give a reason (at least 3 characters)').max(500, 'Max 500 characters') });

export function SuspendShopDialog({ open, onOpenChange, shopId, shopName }: { open: boolean; onOpenChange: (o: boolean) => void; shopId: string; shopName: string }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof reasonSchema>>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });
  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);
  const m = useAdminMutation((reason: string) => adminApi.setShopStatus(shopId, { status: 'SUSPENDED', reason }), {
    success: 'Shop suspended',
    onSuccess: () => onOpenChange(false),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend {shopName}?</DialogTitle>
          <DialogDescription>The storefront goes offline, staff sessions are revoked and the owner is emailed the reason.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => m.mutate(v.reason))} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="suspend-reason">Reason (required)</Label>
            <Textarea id="suspend-reason" rows={3} {...register('reason')} aria-invalid={!!errors.reason} placeholder="e.g. Repeated policy violations" />
            <FormError message={errors.reason?.message} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={m.isPending}>
              Suspend shop
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssignPlanDialog({ open, onOpenChange, detail }: { open: boolean; onOpenChange: (o: boolean) => void; detail: AdminShopDetail }) {
  const plans = useAdminPlans();
  const [planId, setPlanId] = useState('');
  const [interval, setIntervalValue] = useState<BillingInterval>('MONTHLY');
  const [status, setStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [reset, setReset] = useState(false);

  useEffect(() => {
    if (open) {
      setPlanId(detail.subscription?.plan?.id ?? '');
      setIntervalValue(detail.subscription?.interval ?? 'MONTHLY');
      setStatus('ACTIVE');
      setReset(false);
    }
  }, [open, detail]);

  const m = useAdminMutation(() => adminApi.setShopPlan(detail.shop.id, { planId, interval, status, resetOverrides: reset }), {
    success: 'Plan assigned. It is live immediately.',
    onSuccess: (r) => {
      onOpenChange(false);
      if (r.overLimit?.length) toast.warning(`Shop is now over its limit for: ${r.overLimit.map((k) => LIMIT_LABELS[k]).join(', ')}`);
    },
  });
  const options = (plans.data ?? []).filter((p) => p.isActive || p.id === detail.subscription?.plan?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign plan</DialogTitle>
          <DialogDescription>Change {detail.shop.name}’s plan without going through checkout. Downgrades are not blocked.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger aria-label="Plan">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatMoney(p.priceMinor[interval], p.currency)}/{interval === 'YEARLY' ? 'yr' : 'mo'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Billing interval</Label>
              <Select value={interval} onValueChange={(v) => setIntervalValue(v as BillingInterval)}>
                <SelectTrigger aria-label="Billing interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_INTERVALS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SubscriptionStatus)}>
                <SelectTrigger aria-label="Subscription status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUBSCRIPTION_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-start justify-between gap-3 rounded-xl border p-3">
            <span>
              <span className="block text-sm font-medium">Reset limit overrides</span>
              <span className="block text-xs text-muted-foreground">Remove this shop’s custom limits so the new plan’s values apply.</span>
            </span>
            <Switch checked={reset} onCheckedChange={setReset} aria-label="Reset limit overrides" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!planId} loading={m.isPending} onClick={() => m.mutate(undefined)}>
            Assign plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
