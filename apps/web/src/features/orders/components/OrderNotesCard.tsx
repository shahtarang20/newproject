import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ordersApi } from '@/api/endpoints/orders';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { usePermission } from '@/hooks';
import { getErrorMessage } from '@/utils/errors';
import type { Order } from '@/types/commerce';

export function OrderNotesCard({ order }: { order: Order }) {
  const { can } = usePermission();
  const qc = useQueryClient();
  const [value, setValue] = useState(order.internalNote ?? '');
  useEffect(() => setValue(order.internalNote ?? ''), [order.internalNote]);
  const dirty = value.trim() !== (order.internalNote ?? '');
  const writable = can('orders:write');

  const save = useMutation({
    mutationFn: () => ordersApi.updateNotes(order.id, value.trim()),
    onSuccess: (o) => { qc.setQueryData(queryKeys.orders.detail(order.id), o); toast.success('Note saved'); },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not save the note.')),
  });

  return (
    <Card className="print:hidden">
      <CardHeader><CardTitle className="text-base">Internal notes</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Textarea rows={3} maxLength={2000} value={value} onChange={(e) => setValue(e.target.value)} readOnly={!writable} placeholder="Only visible to your team" aria-label="Internal notes" />
        {writable && dirty && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setValue(order.internalNote ?? '')}>Reset</Button>
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save note</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
