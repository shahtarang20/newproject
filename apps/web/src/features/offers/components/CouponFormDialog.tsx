import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toMinor } from '@vastra/shared';
import { offersApi } from '@/api/endpoints/offers';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/utils/errors';
import type { Coupon, CouponPayload } from '@/types/commerce';
import { datesOrder, endOfDayIso, isoToDateInput, majorStr, optInt, optNumber, startOfDayIso } from '../utils';

const schema = z
  .object({
    code: z.string().trim().toUpperCase().max(32),
    description: z.string().trim().max(500),
    discountType: z.enum(['PERCENT', 'FLAT']),
    value: optNumber,
    maxDiscount: optNumber,
    minOrder: optNumber,
    usageLimit: optInt,
    perCustomerLimit: optInt,
    startsAt: z.string(),
    endsAt: z.string(),
    isActive: z.boolean(),
    isEdit: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.isEdit && !/^[A-Z0-9_-]{3,32}$/.test(v.code)) ctx.addIssue({ code: 'custom', path: ['code'], message: '3-32 characters: letters, numbers, - and _' });
    const val = Number(v.value);
    if (v.value === '' || val <= 0) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter a value greater than 0' });
    else if (v.discountType === 'PERCENT' && val > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percent cannot exceed 100' });
    datesOrder(v, ctx);
  });
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  code: '', description: '', discountType: 'PERCENT', value: '', maxDiscount: '', minOrder: '', usageLimit: '', perCustomerLimit: '',
  startsAt: '', endsAt: '', isActive: true, isEdit: false,
};
const fromCoupon = (c: Coupon): FormValues => ({
  code: c.code, description: c.description ?? '', discountType: c.discountType === 'FLAT' ? 'FLAT' : 'PERCENT',
  value: c.discountType === 'FLAT' ? majorStr(c.value) : String(c.value), maxDiscount: majorStr(c.maxDiscountMinor),
  minOrder: c.minOrderMinor ? majorStr(c.minOrderMinor) : '', usageLimit: c.usageLimit ? String(c.usageLimit) : '',
  perCustomerLimit: c.perCustomerLimit ? String(c.perCustomerLimit) : '', startsAt: isoToDateInput(c.startsAt),
  endsAt: isoToDateInput(c.endsAt), isActive: c.isActive, isEdit: true,
});
function toPayload(v: FormValues): CouponPayload {
  const val = Number(v.value);
  return {
    code: v.isEdit ? undefined : v.code,
    description: v.description || undefined,
    discountType: v.discountType,
    value: v.discountType === 'FLAT' ? toMinor(val) : val,
    maxDiscountMinor: v.discountType === 'PERCENT' && v.maxDiscount ? toMinor(Number(v.maxDiscount)) : null,
    minOrderMinor: v.minOrder ? toMinor(Number(v.minOrder)) : 0,
    usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
    perCustomerLimit: v.perCustomerLimit ? Number(v.perCustomerLimit) : null,
    startsAt: startOfDayIso(v.startsAt),
    endsAt: endOfDayIso(v.endsAt),
    isActive: v.isActive,
  };
}

interface Props { open: boolean; coupon: Coupon | null; onOpenChange: (o: boolean) => void }

export function CouponFormDialog({ open, coupon, onOpenChange }: Props) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const { control, watch, reset, handleSubmit } = form;
  useEffect(() => { if (open) reset(coupon ? fromCoupon(coupon) : EMPTY); }, [open, coupon, reset]);
  const type = watch('discountType');

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = toPayload(v);
      if (coupon) {
        const { code: _code, ...rest } = body; // code cannot be changed after creation
        void _code;
        return offersApi.updateCoupon(coupon.id, rest);
      }
      return offersApi.createCoupon(body);
    },
    onSuccess: () => {
      toast.success(coupon ? 'Coupon updated' : 'Coupon created');
      void qc.invalidateQueries({ queryKey: queryKeys.offers.all });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not save the coupon.')),
  });

  const num = (a: object) => ({ ...a, type: 'number' as const, inputMode: 'decimal' as const, min: 0, step: 'any' as const });

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{coupon ? `Edit ${coupon.code}` : 'New coupon'}</DialogTitle>
          <DialogDescription>Customers enter the code at checkout.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
          <FormField control={control} name="code" label="Coupon code" required render={({ field, ...a }) => (
            <Input {...field} {...a} className="font-mono uppercase" disabled={!!coupon} placeholder="WELCOME10" autoComplete="off" />
          )} />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField control={control} name="discountType" label="Discount type" render={({ field, id }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={id}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percentage off</SelectItem>
                  <SelectItem value="FLAT">Flat amount off</SelectItem>
                </SelectContent>
              </Select>
            )} />
            <FormField control={control} name="value" label={type === 'PERCENT' ? 'Percent off' : 'Amount off'} required render={({ field, ...a }) => <Input {...field} {...a} {...num({})} />} />
            {type === 'PERCENT' && <FormField control={control} name="maxDiscount" label="Max discount (optional)" render={({ field, ...a }) => <Input {...field} {...a} {...num({})} />} />}
            <FormField control={control} name="minOrder" label="Minimum order (optional)" render={({ field, ...a }) => <Input {...field} {...a} {...num({})} />} />
            <FormField control={control} name="usageLimit" label="Total usage limit" hint="Leave empty for unlimited" render={({ field, ...a }) => <Input {...field} {...a} type="number" inputMode="numeric" min={1} />} />
            <FormField control={control} name="perCustomerLimit" label="Per customer limit" hint="Leave empty for unlimited" render={({ field, ...a }) => <Input {...field} {...a} type="number" inputMode="numeric" min={1} />} />
            <FormField control={control} name="startsAt" label="Starts (optional)" render={({ field, ...a }) => <Input {...field} {...a} type="date" />} />
            <FormField control={control} name="endsAt" label="Expires (optional)" render={({ field, ...a }) => <Input {...field} {...a} type="date" />} />
          </div>
          <FormField control={control} name="description" label="Description (optional)" render={({ field, id }) => <Textarea id={id} rows={2} {...field} />} />
          <FormField control={control} name="isActive" render={({ field }) => (
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border p-3 text-sm font-medium">
              Active
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{coupon ? 'Save changes' : 'Create coupon'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
