import type { NotificationType } from '@vastra/shared';
import { notify } from '@/providers/notifications/notify.service';
import type { IOrder } from '@/database/models/order.model';

/** Lean order → API DTO (`id` instead of `_id`/`__v`). */
export function toOrderDto(o: IOrder & { __v?: number }): Record<string, unknown> {
  const { _id, __v: _v, ...rest } = o;
  return { id: String(_id), ...rest };
}

/** Customer-directed notification over email/WhatsApp (never throws, never blocks). */
export function notifyCustomer(
  order: Pick<IOrder, 'shopId' | 'orderNumber' | 'customerSnapshot' | '_id'>,
  type: NotificationType,
  title: string,
  body: string,
): void {
  const { email, phone } = order.customerSnapshot;
  if (!email && !phone) return;
  void notify({
    shopId: String(order.shopId),
    type,
    title,
    body,
    data: { orderId: String(order._id), orderNumber: order.orderNumber },
    channels: [...(email ? (['EMAIL'] as const) : []), ...(phone ? (['WHATSAPP'] as const) : [])],
    recipient: { email, phone },
  });
}
