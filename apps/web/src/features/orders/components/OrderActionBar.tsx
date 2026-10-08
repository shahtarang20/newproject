import { useState } from 'react';
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@vastra/shared';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { ORDER_STATUS_LABELS } from '@/utils/labels';
import type { Order } from '@/types/commerce';
import { useUpdateOrderStatus } from '../hooks';
import { STATUS_ACTIONS } from '../utils';
import { StatusNoteDialog } from './StatusNoteDialog';

/** Sticky action bar: only statuses that are valid next steps per ORDER_STATUS_TRANSITIONS. */
export function OrderActionBar({ order }: { order: Order }) {
  const confirm = useConfirm();
  const update = useUpdateOrderStatus();
  const [target, setTarget] = useState<OrderStatus | null>(null);

  const next = ORDER_STATUS_TRANSITIONS[order.status];
  if (next.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/40 p-3 text-center text-sm text-muted-foreground print:hidden">
        This order is {ORDER_STATUS_LABELS[order.status].toLowerCase()}. No further status changes are possible.
      </div>
    );
  }
  const forward = next.filter((s) => !STATUS_ACTIONS[s].destructive);
  const destructive = next.filter((s) => STATUS_ACTIONS[s].destructive);

  const submit = async (note: string) => {
    if (!target) return;
    if (STATUS_ACTIONS[target].destructive) {
      const ok = await confirm({
        title: `${STATUS_ACTIONS[target].label}?`,
        description: `Order ${order.orderNumber} will be ${ORDER_STATUS_LABELS[target].toLowerCase()} and its stock will be restored. This cannot be undone.`,
        confirmText: STATUS_ACTIONS[target].label,
        destructive: true,
      });
      if (!ok) return;
    }
    const status = target;
    setTarget(null);
    update.mutate({ id: order.id, status, note: note || undefined });
  };

  return (
    <>
      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:mx-0 sm:rounded-2xl sm:border print:hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {forward.map((s, i) => (
            <Button key={s} size="lg" className="w-full sm:w-auto" variant={i === 0 ? 'default' : 'secondary'} disabled={update.isPending} onClick={() => setTarget(s)}>
              {STATUS_ACTIONS[s].label}
            </Button>
          ))}
          {destructive.map((s) => (
            <Button key={s} size="lg" variant="outline" className="w-full text-destructive hover:text-destructive sm:ml-auto sm:w-auto" disabled={update.isPending} onClick={() => setTarget(s)}>
              {STATUS_ACTIONS[s].label}
            </Button>
          ))}
        </div>
      </div>
      <StatusNoteDialog status={target} orderNumber={order.orderNumber} onCancel={() => setTarget(null)} onSubmit={submit} />
    </>
  );
}
