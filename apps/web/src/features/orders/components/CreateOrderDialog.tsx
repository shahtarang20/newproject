import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ordersApi } from '@/api/endpoints/orders';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormError, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MoneyText } from '@/components/common/MoneyText';
import { getErrorMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { VariantPicker, Thumb, type PickedLine } from './VariantPicker';

const PHONE = /^\+?[0-9\s-]{7,16}$/;
const lineSchema = z.object({
  productId: z.string(), variantId: z.string(), name: z.string(), label: z.string(), imageUrl: z.string().optional(),
  priceMinor: z.number(), stock: z.number(), quantity: z.number().int().min(1, 'Min 1').max(100),
});
const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter the customer name').max(120),
    phone: z.string().trim().regex(PHONE, 'Enter a valid phone number'),
    deliveryType: z.enum(['PICKUP', 'DELIVERY']),
    line1: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
    paymentMethod: z.enum(['PAY_AT_SHOP', 'COD']),
    markPaid: z.boolean(),
    couponCode: z.string().trim().max(32).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z.array(lineSchema).min(1, 'Add at least one item'),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryType !== 'DELIVERY') return;
    (['line1', 'city', 'state', 'pincode'] as const).forEach((k) => {
      if (!v[k] || v[k]!.length < 2) ctx.addIssue({ code: 'custom', path: [k], message: 'Required for delivery' });
    });
  })
  .superRefine((v, ctx) => {
    v.items.forEach((l, i) => {
      if (l.quantity > l.stock) ctx.addIssue({ code: 'custom', path: ['items', i, 'quantity'], message: `Only ${l.stock} in stock` });
    });
  });
type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  name: '', phone: '', deliveryType: 'PICKUP', line1: '', city: '', state: '', pincode: '',
  paymentMethod: 'PAY_AT_SHOP', markPaid: false, couponCode: '', notes: '', items: [],
};

interface Props { open: boolean; onOpenChange: (o: boolean) => void; currency?: string; onCreated?: (orderId: string) => void }

export function CreateOrderDialog({ open, onOpenChange, currency = 'INR', onCreated }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(true);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const { control, register, watch, setValue, handleSubmit, reset, formState: { errors } } = form;
  const items = watch('items');
  const deliveryType = watch('deliveryType');
  const subtotal = items.reduce((s, l) => s + l.priceMinor * l.quantity, 0);

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      ordersApi.create({
        items: v.items.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        customer: { name: v.name, phone: v.phone },
        deliveryType: v.deliveryType,
        address: v.deliveryType === 'DELIVERY' ? { line1: v.line1!, city: v.city!, state: v.state!, pincode: v.pincode!, country: 'IN' } : undefined,
        paymentMethod: v.paymentMethod,
        markPaid: v.markPaid,
        couponCode: v.couponCode || undefined,
        notes: v.notes || undefined,
      }),
    onSuccess: (res) => {
      toast.success(`Order ${res.orderNumber} created`);
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      reset(DEFAULTS);
      setAdding(true);
      onOpenChange(false);
      onCreated?.(res.orderId);
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not create the order.')),
  });

  const addLine = (l: PickedLine) => {
    const existing = items.findIndex((x) => x.variantId === l.variantId);
    if (existing >= 0) {
      setValue(`items.${existing}.quantity`, Math.min(items[existing].quantity + 1, l.stock), { shouldValidate: true });
    } else {
      setValue('items', [...items, { ...l, quantity: 1 }], { shouldValidate: true });
    }
    setAdding(false);
  };
  const setQty = (i: number, q: number) => setValue(`items.${i}.quantity`, Math.max(1, Math.min(100, q)), { shouldValidate: true });
  const removeLine = (i: number) => setValue('items', items.filter((_, idx) => idx !== i), { shouldValidate: true });
  const itemsError = typeof errors.items?.message === 'string' ? errors.items.message : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!create.isPending) onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New walk-in order</DialogTitle>
          <DialogDescription>Create an order on behalf of a customer. Stock is reduced immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-5" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField control={control} name="name" label="Customer name" required render={({ field, ...a }) => <Input {...field} {...a} autoComplete="off" />} />
            <FormField control={control} name="phone" label="Phone" required render={({ field, ...a }) => <Input {...field} {...a} type="tel" inputMode="tel" placeholder="+91 98765 43210" />} />
          </div>

          <section className="space-y-2">
            <Label>Items</Label>
            {items.map((l, i) => (
              <div key={l.variantId} className="flex items-center gap-3 rounded-xl border p-2.5">
                <Thumb src={l.imageUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.label} · <MoneyText minor={l.priceMinor} currency={currency} /></p>
                  {errors.items?.[i]?.quantity?.message && <FormError message={errors.items[i]!.quantity!.message} />}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon-sm" aria-label="Decrease quantity" onClick={() => setQty(i, l.quantity - 1)}><Minus className="h-3.5 w-3.5" /></Button>
                  <span className="w-7 text-center text-sm tabular-nums">{l.quantity}</span>
                  <Button type="button" variant="outline" size="icon-sm" aria-label="Increase quantity" onClick={() => setQty(i, l.quantity + 1)}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove item" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {adding ? (
              <VariantPicker onAdd={addLine} currency={currency} />
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" /> Add another item</Button>
            )}
            <FormError message={itemsError} />
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField control={control} name="deliveryType" label="Fulfilment" render={({ field, id }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={id}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PICKUP">Store pickup / walk-in</SelectItem>
                  <SelectItem value="DELIVERY">Home delivery</SelectItem>
                </SelectContent>
              </Select>
            )} />
            <FormField control={control} name="paymentMethod" label="Payment method" render={({ field, id }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={id}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAY_AT_SHOP">Pay at shop</SelectItem>
                  <SelectItem value="COD">Cash on delivery</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>

          {deliveryType === 'DELIVERY' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={control} name="line1" label="Address" required className="sm:col-span-2" render={({ field, ...a }) => <Input {...field} {...a} value={field.value ?? ''} />} />
              <FormField control={control} name="city" label="City" required render={({ field, ...a }) => <Input {...field} {...a} value={field.value ?? ''} />} />
              <FormField control={control} name="state" label="State" required render={({ field, ...a }) => <Input {...field} {...a} value={field.value ?? ''} />} />
              <FormField control={control} name="pincode" label="Pincode" required render={({ field, ...a }) => <Input {...field} {...a} inputMode="numeric" value={field.value ?? ''} />} />
            </div>
          )}

          <label className="flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm">
            <Checkbox checked={watch('markPaid')} onCheckedChange={(c) => setValue('markPaid', c === true)} />
            <span>
              <span className="font-medium">Customer already paid in full</span>
              <span className="block text-xs text-muted-foreground">Marks the payment as paid.</span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="couponCode">Coupon code (optional)</Label>
              <Input id="couponCode" {...register('couponCode')} className="uppercase" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Subtotal <span className="font-semibold text-foreground">{formatMoney(subtotal, currency)}</span> <span className="text-xs">(final price calculated by server)</span></p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
              <Button type="submit" loading={create.isPending}>Create order</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
