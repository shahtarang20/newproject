import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DISCOUNT_TYPES, toMinor } from '@vastra/shared';
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
import { DISCOUNT_TYPE_LABELS } from '@/utils/labels';
import type { Offer, OfferPayload } from '@/types/commerce';
import { datesOrder, endOfDayIso, isoToDateInput, majorStr, optInt, optNumber, startOfDayIso } from '../utils';
import { CategoryMultiPicker, ProductMultiPicker } from './ScopePickers';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').max(120),
    description: z.string().trim().max(500),
    badgeText: z.string().trim().max(40),
    discountType: z.enum(DISCOUNT_TYPES),
    value: optNumber,
    maxDiscount: optNumber,
    buyQty: optInt,
    getQty: optInt,
    scope: z.enum(['ALL', 'PRODUCTS', 'CATEGORIES']),
    productIds: z.array(z.string()),
    categoryIds: z.array(z.string()),
    minOrder: optNumber,
    startsAt: z.string(),
    endsAt: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const val = Number(v.value);
    if (v.discountType === 'PERCENT' && (v.value === '' || val <= 0 || val > 100)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percent must be between 1 and 100' });
    if (v.discountType === 'FLAT' && (v.value === '' || val <= 0)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter an amount greater than 0' });
    if (v.discountType === 'BUY_X_GET_Y') {
      if (!v.buyQty) ctx.addIssue({ code: 'custom', path: ['buyQty'], message: 'Required' });
      if (!v.getQty) ctx.addIssue({ code: 'custom', path: ['getQty'], message: 'Required' });
    }
    if (v.scope === 'PRODUCTS' && !v.productIds.length) ctx.addIssue({ code: 'custom', path: ['productIds'], message: 'Select at least one product' });
    if (v.scope === 'CATEGORIES' && !v.categoryIds.length) ctx.addIssue({ code: 'custom', path: ['categoryIds'], message: 'Select at least one category' });
    datesOrder(v, ctx);
  });
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  name: '', description: '', badgeText: '', discountType: 'PERCENT', value: '', maxDiscount: '', buyQty: '', getQty: '',
  scope: 'ALL', productIds: [], categoryIds: [], minOrder: '', startsAt: '', endsAt: '', isActive: true,
};

const fromOffer = (o: Offer): FormValues => ({
  name: o.name, description: o.description ?? '', badgeText: o.badgeText ?? '', discountType: o.discountType,
  value: o.discountType === 'FLAT' ? majorStr(o.value) : o.discountType === 'PERCENT' ? String(o.value) : '',
  maxDiscount: majorStr(o.maxDiscountMinor), buyQty: o.buyQty ? String(o.buyQty) : '', getQty: o.getQty ? String(o.getQty) : '',
  scope: o.scope, productIds: o.productIds ?? [], categoryIds: o.categoryIds ?? [], minOrder: o.minOrderMinor ? majorStr(o.minOrderMinor) : '',
  startsAt: isoToDateInput(o.startsAt), endsAt: isoToDateInput(o.endsAt), isActive: o.isActive,
});

function toPayload(v: FormValues): OfferPayload {
  const val = Number(v.value || 0);
  return {
    name: v.name,
    description: v.description || undefined,
    badgeText: v.badgeText || undefined,
    discountType: v.discountType,
    value: v.discountType === 'FLAT' ? toMinor(val) : v.discountType === 'PERCENT' ? val : 0,
    maxDiscountMinor: v.discountType === 'PERCENT' && v.maxDiscount ? toMinor(Number(v.maxDiscount)) : null,
    buyQty: v.discountType === 'BUY_X_GET_Y' ? Number(v.buyQty) : undefined,
    getQty: v.discountType === 'BUY_X_GET_Y' ? Number(v.getQty) : undefined,
    scope: v.scope,
    productIds: v.scope === 'PRODUCTS' ? v.productIds : [],
    categoryIds: v.scope === 'CATEGORIES' ? v.categoryIds : [],
    minOrderMinor: v.minOrder ? toMinor(Number(v.minOrder)) : 0,
    startsAt: startOfDayIso(v.startsAt),
    endsAt: endOfDayIso(v.endsAt),
    isActive: v.isActive,
  };
}

interface Props { open: boolean; offer: Offer | null; onOpenChange: (o: boolean) => void }

export function OfferFormDialog({ open, offer, onOpenChange }: Props) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const { control, watch, reset, handleSubmit, setValue } = form;
  useEffect(() => { if (open) reset(offer ? fromOffer(offer) : EMPTY); }, [open, offer, reset]);
  const type = watch('discountType');
  const scope = watch('scope');

  const save = useMutation({
    mutationFn: (v: FormValues) => (offer ? offersApi.update(offer.id, toPayload(v)) : offersApi.create(toPayload(v))),
    onSuccess: () => {
      toast.success(offer ? 'Offer updated' : 'Offer created');
      void qc.invalidateQueries({ queryKey: queryKeys.offers.all });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not save the offer.')),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{offer ? 'Edit offer' : 'New offer'}</DialogTitle>
          <DialogDescription>Offers apply automatically at checkout. The best matching offer wins.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
          <FormField control={control} name="name" label="Offer name" required render={({ field, ...a }) => <Input {...field} {...a} placeholder="Festive 20% off" />} />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField control={control} name="discountType" label="Discount type" render={({ field, id }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={id}><SelectValue /></SelectTrigger>
                <SelectContent>{DISCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{DISCOUNT_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {type !== 'BUY_X_GET_Y' ? (
              <FormField control={control} name="value" label={type === 'PERCENT' ? 'Percent off' : 'Amount off'} required render={({ field, ...a }) => (
                <Input {...field} {...a} type="number" inputMode="decimal" min={0} step="any" placeholder={type === 'PERCENT' ? '20' : '200'} />
              )} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <FormField control={control} name="buyQty" label="Buy" required render={({ field, ...a }) => <Input {...field} {...a} type="number" inputMode="numeric" min={1} />} />
                <FormField control={control} name="getQty" label="Get free" required render={({ field, ...a }) => <Input {...field} {...a} type="number" inputMode="numeric" min={1} />} />
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {type === 'PERCENT' && (
              <FormField control={control} name="maxDiscount" label="Max discount (optional)" render={({ field, ...a }) => <Input {...field} {...a} type="number" inputMode="decimal" min={0} step="any" />} />
            )}
            <FormField control={control} name="minOrder" label="Minimum order (optional)" render={({ field, ...a }) => <Input {...field} {...a} type="number" inputMode="decimal" min={0} step="any" />} />
            <FormField control={control} name="badgeText" label="Badge text (optional)" render={({ field, ...a }) => <Input {...field} {...a} placeholder="20% OFF" />} />
          </div>

          <FormField control={control} name="scope" label="Applies to" render={({ field, id }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={id}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All products</SelectItem>
                <SelectItem value="PRODUCTS">Selected products</SelectItem>
                <SelectItem value="CATEGORIES">Selected categories</SelectItem>
              </SelectContent>
            </Select>
          )} />
          {scope === 'PRODUCTS' && (
            <FormField control={control} name="productIds" label="Products" render={({ field }) => <ProductMultiPicker value={field.value} onChange={(ids) => setValue('productIds', ids, { shouldValidate: true })} />} />
          )}
          {scope === 'CATEGORIES' && (
            <FormField control={control} name="categoryIds" label="Categories" render={({ field }) => <CategoryMultiPicker value={field.value} onChange={(ids) => setValue('categoryIds', ids, { shouldValidate: true })} />} />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField control={control} name="startsAt" label="Starts (optional)" render={({ field, ...a }) => <Input {...field} {...a} type="date" />} />
            <FormField control={control} name="endsAt" label="Ends (optional)" render={({ field, ...a }) => <Input {...field} {...a} type="date" />} />
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
            <Button type="submit" loading={save.isPending}>{offer ? 'Save changes' : 'Create offer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
