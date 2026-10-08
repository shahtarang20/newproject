import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ordersApi } from '@/api/endpoints/orders';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/common/StatusBadge';
import { usePermission } from '@/hooks';
import { getErrorMessage } from '@/utils/errors';
import { PAYMENT_METHOD_LABELS } from '@/utils/labels';
import type { Order } from '@/types/commerce';

export function OrderPaymentCard({ order }: { order: Order }) {
  const { can } = usePermission();
  const qc = useQueryClient();
  const [target, setTarget] = useState<'PAID' | 'REFUNDED' | null>(null);
  const [note, setNote] = useState('');
  const [viaProvider, setViaProvider] = useState(false);

  const mutation = useMutation({
    mutationFn: () => ordersApi.updatePayment(order.id, { status: target!, note: note.trim() || undefined, refundViaProvider: target === 'REFUNDED' && viaProvider }),
    onSuccess: (o) => {
      qc.setQueryData(queryKeys.orders.detail(order.id), o);
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success(target === 'PAID' ? 'Marked as paid' : 'Marked as refunded');
      setTarget(null);
      setNote('');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not update payment.')),
  });

  const closed = order.status === 'CANCELLED' || order.status === 'REJECTED';
  const canMarkPaid = order.paymentStatus !== 'PAID' && order.paymentStatus !== 'REFUNDED' && !closed;
  const canRefund = order.paymentStatus === 'PAID';

  return (
    <Card className="print:hidden">
      <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Method</span>
          <span className="font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge type="payment" status={order.paymentStatus} />
        </div>
        {can('orders:write') && (canMarkPaid || canRefund) && (
          <div className="flex gap-2 pt-1">
            {canMarkPaid && <Button className="flex-1" variant="soft" onClick={() => setTarget('PAID')}>Mark as paid</Button>}
            {canRefund && <Button className="flex-1" variant="outline" onClick={() => setTarget('REFUNDED')}>Mark refunded</Button>}
          </div>
        )}
      </CardContent>

      <Dialog open={!!target} onOpenChange={(o) => !o && !mutation.isPending && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{target === 'PAID' ? 'Mark payment as received' : 'Mark payment as refunded'}</DialogTitle>
            <DialogDescription>
              {target === 'PAID' ? 'Use this when you have collected the payment (cash, UPI at shop, etc.).' : 'The full amount will be marked as refunded.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {target === 'REFUNDED' && order.paymentMethod === 'ONLINE' && (
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={viaProvider} onCheckedChange={(c) => setViaProvider(c === true)} />
                Also refund through the payment provider
              </label>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="pay-note">Note (optional)</Label>
              <Textarea id="pay-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={mutation.isPending}>Cancel</Button>
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
