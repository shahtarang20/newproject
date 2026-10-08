import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { usePermission } from '@/hooks';
import type { Order } from '@/types/commerce';
import { useUpdateOrderStatus } from '../hooks';

/** Confirm / Reject for PENDING orders, usable on list rows and mobile cards. */
export function QuickActions({ order, large }: { order: Order; large?: boolean }) {
  const { can } = usePermission();
  const confirm = useConfirm();
  const update = useUpdateOrderStatus();
  if (order.status !== 'PENDING' || !can('orders:write')) return null;
  const size = large ? 'default' : 'sm';

  const reject = async () => {
    const ok = await confirm({
      title: `Reject order ${order.orderNumber}?`,
      description: 'The customer will be told their order was rejected and the reserved stock will be restored. This cannot be undone.',
      confirmText: 'Reject order',
      destructive: true,
    });
    if (ok) update.mutate({ id: order.id, status: 'REJECTED' });
  };

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button size={size} className={large ? 'flex-1' : undefined} disabled={update.isPending} onClick={() => update.mutate({ id: order.id, status: 'CONFIRMED' })}>
        <Check className="h-4 w-4" /> Confirm
      </Button>
      <Button size={size} variant="outline" className={large ? 'flex-1' : undefined} disabled={update.isPending} onClick={reject}>
        <X className="h-4 w-4" /> Reject
      </Button>
    </div>
  );
}
