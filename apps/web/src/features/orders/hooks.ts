import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { OrderStatus } from '@vastra/shared';
import { ordersApi } from '@/api/endpoints/orders';
import { queryKeys } from '@/api/queryKeys';
import { getErrorMessage } from '@/utils/errors';
import { ORDER_STATUS_LABELS } from '@/utils/labels';
import type { Order, PaginationMeta } from '@/types/commerce';

interface ListData { items: Order[]; meta?: PaginationMeta }
interface Vars { id: string; status: OrderStatus; note?: string }
interface Ctx { detail?: Order; lists: [QueryKey, ListData | undefined][] }

/** Status change with optimistic UI (detail + every cached list) and rollback on error. */
export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation<Order, unknown, Vars, Ctx>({
    mutationFn: ({ id, status, note }) => ordersApi.updateStatus(id, { status, note }),
    onMutate: async ({ id, status, note }) => {
      await qc.cancelQueries({ queryKey: queryKeys.orders.all });
      const detail = qc.getQueryData<Order>(queryKeys.orders.detail(id));
      const lists = qc.getQueriesData<ListData>({ queryKey: ['orders', 'list'] });
      if (detail) {
        qc.setQueryData<Order>(queryKeys.orders.detail(id), {
          ...detail,
          status,
          timeline: [...(detail.timeline ?? []), { status, at: new Date().toISOString(), byLabel: 'You', note }],
        });
      }
      for (const [key, data] of lists) {
        if (data) qc.setQueryData<ListData>(key, { ...data, items: data.items.map((o) => (o.id === id ? { ...o, status } : o)) });
      }
      return { detail, lists };
    },
    onError: (err, { id }, ctx) => {
      if (ctx?.detail) qc.setQueryData(queryKeys.orders.detail(id), ctx.detail);
      ctx?.lists.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(getErrorMessage(err, 'Could not update the order status.'));
    },
    onSuccess: (order, { status }) => {
      qc.setQueryData(queryKeys.orders.detail(order.id), order);
      toast.success(`Order ${order.orderNumber} marked ${ORDER_STATUS_LABELS[status].toLowerCase()}`);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export const ORDER_STATS_KEY = [...queryKeys.orders.all, 'stats'] as const;
