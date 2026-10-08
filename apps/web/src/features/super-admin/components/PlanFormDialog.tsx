import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import { FEATURE_KEYS, LIMIT_KEYS, fromMinor, toMinor, type PlanFeatures, type PlanLimits } from '@vastra/shared';
import { adminApi } from '@/api/endpoints/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormError } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { AdminPlan, PlanInput } from '@/types/admin';
import { getErrorMessage, getFieldErrors } from '@/utils/errors';
import { toast } from 'sonner';
import { useAdminMutation } from '../hooks/useAdmin';
import { FEATURE_TITLES } from './AdminBits';
import { LimitField } from './LimitField';

const num = (label: string) => z.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} cannot be negative`);

const limitValue = z.number().int().min(0).nullable();
const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(60),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,29}$/, 'Use A-Z, 0-9 and _ (2-30 chars, start with a letter)'),
  description: z.string().trim().max(500),
  monthly: num('Monthly price'),
  yearly: num('Yearly price'),
  currency: z.string().trim().length(3, 'Use a 3-letter code, e.g. INR'),
  trialDays: z.number({ invalid_type_error: 'Enter a number' }).int('Whole days only').min(0).max(365, 'Max 365'),
  sortOrder: z.number({ invalid_type_error: 'Enter a number' }).int('Whole number'),
  isPublic: z.boolean(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  limits: z.object(Object.fromEntries(LIMIT_KEYS.map((k) => [k, limitValue]))),
  features: z.object(Object.fromEntries(FEATURE_KEYS.map((k) => [k, z.boolean()]))),
});
type FormValues = z.infer<typeof schema>;

const emptyLimits = Object.fromEntries(LIMIT_KEYS.map((k) => [k, k === 'storageBytes' ? 1024 ** 3 : 100])) as PlanLimits;
const emptyFeatures = Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])) as PlanFeatures;

function toDefaults(plan?: AdminPlan | null, mode: 'create' | 'edit' | 'duplicate' = 'create'): FormValues {
  if (!plan) {
    return { name: '', code: '', description: '', monthly: 0, yearly: 0, currency: 'INR', trialDays: 0, sortOrder: 0, isPublic: true, isDefault: false, isActive: true, limits: { ...emptyLimits }, features: { ...emptyFeatures } } as FormValues;
  }
  const dup = mode === 'duplicate';
  return {
    name: dup ? `${plan.name} (copy)` : plan.name,
    code: dup ? `${plan.code}_COPY`.slice(0, 30) : plan.code,
    description: plan.description ?? '',
    monthly: fromMinor(plan.priceMinor.MONTHLY),
    yearly: fromMinor(plan.priceMinor.YEARLY),
    currency: plan.currency,
    trialDays: plan.trialDays,
    sortOrder: plan.sortOrder,
    isPublic: plan.isPublic,
    isDefault: dup ? false : plan.isDefault,
    isActive: plan.isActive,
    limits: { ...plan.limits },
    features: { ...plan.features },
  } as FormValues;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan to edit, or the source plan to duplicate. */
  plan?: AdminPlan | null;
  mode: 'create' | 'edit' | 'duplicate';
}

export function PlanFormDialog({ open, onOpenChange, plan, mode }: Props) {
  const editing = mode === 'edit' && !!plan;
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toDefaults(plan, mode) });
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = form;

  useEffect(() => {
    if (open) reset(toDefaults(plan, mode));
  }, [open, plan, mode, reset]);

  const save = useAdminMutation(
    async (v: FormValues) => {
      const body: PlanInput = {
        name: v.name.trim(),
        description: v.description.trim(),
        priceMinor: { MONTHLY: toMinor(v.monthly), YEARLY: toMinor(v.yearly) },
        currency: v.currency.trim().toUpperCase(),
        trialDays: v.trialDays,
        limits: v.limits as PlanLimits,
        features: v.features as PlanFeatures,
        isPublic: v.isPublic,
        isActive: v.isActive,
        isDefault: v.isDefault,
        sortOrder: v.sortOrder,
      };
      if (editing) return adminApi.updatePlan(plan.id, body);
      return adminApi.createPlan({ ...body, code: v.code.trim().toUpperCase() });
    },
    { success: editing ? 'Plan updated. Changes are live for all shops on this plan.' : 'Plan created', onSuccess: () => onOpenChange(false) },
  );

  const submit = handleSubmit(
    (v) =>
      save.mutate(v, {
        onError: (err) => {
          const fe = getFieldErrors(err);
          for (const [k, msg] of Object.entries(fe)) if (k in schema.shape) setError(k as keyof FormValues, { message: msg });
          toast.error(getErrorMessage(err));
        },
      }),
    () => toast.error('Please fix the highlighted fields'),
  );

  const title = mode === 'edit' ? `Edit ${plan?.name ?? 'plan'}` : mode === 'duplicate' ? 'Duplicate plan' : 'Create plan';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Plans define what every shop on them can do. Limits and features are read live by the API.</DialogDescription>
        </DialogHeader>

        {editing && (
          <div className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm" role="note">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>
              Edits take effect <strong>immediately for all {plan.shopCount} shop{plan.shopCount === 1 ? '' : 's'}</strong> on this plan, with no deploy.
              Lowering a limit below current usage will block new items for those shops.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-6" noValidate>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Name</Label>
              <Input id="plan-name" {...register('name')} aria-invalid={!!errors.name} placeholder="Growth" />
              <FormError message={errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-code">Code</Label>
              <Input id="plan-code" {...register('code')} disabled={editing} aria-invalid={!!errors.code} className="uppercase" placeholder="GROWTH" />
              {editing ? <p className="text-xs text-muted-foreground">The code cannot be changed after creation.</p> : <FormError message={errors.code?.message} />}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-desc">Description</Label>
              <Textarea id="plan-desc" rows={2} {...register('description')} placeholder="Shown on the pricing page" />
              <FormError message={errors.description?.message} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">Pricing</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-monthly">Monthly price</Label>
                <Input id="plan-monthly" type="number" step="any" min={0} {...register('monthly', { valueAsNumber: true })} aria-invalid={!!errors.monthly} />
                <FormError message={errors.monthly?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-yearly">Yearly price</Label>
                <Input id="plan-yearly" type="number" step="any" min={0} {...register('yearly', { valueAsNumber: true })} aria-invalid={!!errors.yearly} />
                <FormError message={errors.yearly?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-currency">Currency</Label>
                <Input id="plan-currency" maxLength={3} className="uppercase" {...register('currency')} aria-invalid={!!errors.currency} />
                <FormError message={errors.currency?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-trial">Trial days</Label>
                <Input id="plan-trial" type="number" min={0} {...register('trialDays', { valueAsNumber: true })} aria-invalid={!!errors.trialDays} />
                <FormError message={errors.trialDays?.message} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Enter prices in major units (e.g. 499 = ₹499). They are stored in minor units. A price of 0 makes that interval free.</p>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">Limits</h3>
            <div className="divide-y rounded-xl border">
              {LIMIT_KEYS.map((k) => (
                <div key={k} className="px-3 py-2.5">
                  <Controller control={control} name={`limits.${k}`} render={({ field }) => <LimitField limitKey={k} value={field.value as number | null} onChange={field.onChange} />} />
                </div>
              ))}
            </div>
            <FormError message={errors.limits ? 'Check the limit values' : undefined} className="mt-2" />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">Features</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {FEATURE_KEYS.map((k) => (
                <Controller
                  key={k}
                  control={control}
                  name={`features.${k}`}
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{FEATURE_TITLES[k]?.title ?? k}</span>
                        <span className="block text-xs text-muted-foreground">{FEATURE_TITLES[k]?.hint}</span>
                      </span>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} aria-label={FEATURE_TITLES[k]?.title ?? k} />
                    </label>
                  )}
                />
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['isPublic', 'Public', 'Visible on the pricing page'],
                ['isDefault', 'Default plan', 'Assigned to new shops. Demotes the current default.'],
                ['isActive', 'Active', 'Inactive plans cannot be chosen by shops'],
              ] as const
            ).map(([name, label, hint]) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field }) => (
                  <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3">
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={label} />
                  </label>
                )}
              />
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="plan-sort">Sort order</Label>
              <Input id="plan-sort" type="number" {...register('sortOrder', { valueAsNumber: true })} aria-invalid={!!errors.sortOrder} />
              <FormError message={errors.sortOrder?.message} />
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
