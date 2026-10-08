import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { INVENTORY_TXN_TYPES } from '@vastra/shared';
import { inventoryApi } from '@/api/endpoints/inventory';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/utils/errors';
import type { AdjustType, InventoryItem } from '@/types/commerce';
import { ADJUST_TYPES, signedDelta, variantText } from '../utils';

const ADJUSTABLE = INVENTORY_TXN_TYPES.filter((t) => t !== 'SALE') as [AdjustType, ...AdjustType[]];
const schema = z
  .object({
    type: z.enum(ADJUSTABLE),
    quantity: z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Whole numbers only').min(-1_000_000).max(1_000_000),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.quantity === 0) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Quantity cannot be zero' });
    else if (v.type !== 'ADJUSTMENT' && v.quantity < 0) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Use a positive number; direction is set by the type' });
  });
type FormValues = z.infer<typeof schema>;

interface Props {
  item: InventoryItem | null;
  initialType?: AdjustType;
  onOpenChange: (open: boolean) => void;
}

export function AdjustStockDialog({ item, initialType = 'PURCHASE', onOpenChange }: Props) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: initialType, quantity: 1, note: '' } });
  const { control, watch, reset, handleSubmit } = form;
  useEffect(() => { if (item) reset({ type: initialType, quantity: 1, note: '' }); }, [item, initialType, reset]);

  const type = watch('type');
  const qty = Number(watch('quantity')) || 0;
  const after = item ? item.stock + signedDelta(type, qty) : 0;

  const adjust = useMutation({
    mutationFn: (v: FormValues) => inventoryApi.adjust({ variantId: item!.variantId, type: v.type, quantity: v.quantity, note: v.note || undefined }),
    onSuccess: (r) => {
      toast.success(`Stock updated: ${r.before} to ${r.stock}`);
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.products.all });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not adjust stock.')),
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !adjust.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{item ? `${item.productName} - ${variantText(item.colour, item.size)} (${item.sku})` : null}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => adjust.mutate(v))} className="space-y-4" noValidate>
          <FormField control={control} name="type" label="Type" description={ADJUST_TYPES.find((t) => t.value === type)?.hint} render={({ field, id }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={id}><SelectValue /></SelectTrigger>
              <SelectContent>{ADJUST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          <FormField control={control} name="quantity" label="Quantity" required render={({ field, ...a }) => (
            <Input {...a} type="number" inputMode="numeric" step={1} className="h-12 text-lg" name={field.name} ref={field.ref} onBlur={field.onBlur}
              value={field.value as number | string} onChange={(e) => field.onChange(e.target.value)} />
          )} />
          <FormField control={control} name="note" label="Note (optional)" render={({ field, id }) => (
            <Textarea id={id} rows={2} maxLength={500} {...field} value={field.value ?? ''} placeholder="e.g. Supplier invoice #123" />
          )} />
          {item && (
            <p className="rounded-xl bg-muted p-3 text-sm">
              Stock <span className="font-semibold tabular-nums">{item.stock}</span> to{' '}
              <span className={`font-semibold tabular-nums ${after < 0 ? 'text-destructive' : ''}`}>{after}</span>
              {after < 0 && <span className="ml-2 text-destructive">Stock cannot go below 0</span>}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={adjust.isPending}>Cancel</Button>
            <Button type="submit" loading={adjust.isPending} disabled={after < 0}>Save adjustment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
