import { Types } from 'mongoose';
import {
  ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  STOCK_RESTORING_STATUSES,
  type NotificationType,
  type OrderStatus,
} from '@vastra/shared';
import { Errors } from '@/common/errors';
import { audit } from '@/common/audit';
import { buildMeta } from '@/common/pagination';
import { formatMoney } from '@/common/utils/money';
import { logger } from '@/config/logger';
import { InventoryTransaction } from '@/database/models/inventory-transaction.model';
import { Order, type IOrder } from '@/database/models/order.model';
import { Payment } from '@/database/models/payment.model';
import { decrementStock, incrementStock, recomputeProducts, recordTransaction } from '@/modules/inventory/inventory.service';
import { runAtomic } from '@/modules/inventory/transaction';
import { releaseCoupon } from '@/modules/offers/offers.service';
import { applyPaymentPaid, refundOrderPayment } from '@/modules/payments/payments.service';
import { notifyCustomer, toOrderDto } from './orders.helpers';
import type { ListOrdersQuery, UpdateNotesInput, UpdatePaymentInput, UpdateStatusInput } from './orders.schemas';

export interface Actor {
  userId: string;
  ip?: string;
  label?: string;
}

const sid = (v: string): Types.ObjectId => new Types.ObjectId(v);
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function loadOrder(shopId: string, id: string): Promise<IOrder> {
  const order = await Order.findOne({ _id: id, shopId: sid(shopId) }).lean<IOrder>();
  if (!order) throw Errors.notFound('ORDER_NOT_FOUND', 'Order not found');
  return order;
}

export async function listOrders(shopId: string, q: ListOrdersQuery) {
  const filter: Record<string, unknown> = { shopId: sid(shopId) };
  if (q.status?.length) filter.status = { $in: q.status };
  if (q.paymentStatus?.length) filter.paymentStatus = { $in: q.paymentStatus };
  if (q.paymentMethod) filter.paymentMethod = q.paymentMethod;
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ orderNumber: re }, { 'customerSnapshot.name': re }, { 'customerSnapshot.phone': re }];
  }
  const sortField = q.sort.replace(/^-/, '');
  const sort: Record<string, 1 | -1> = { [sortField]: q.sort.startsWith('-') ? -1 : 1, _id: -1 };
  const [total, docs] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .select('-timeline -placedByIp')
      .lean<IOrder[]>(),
  ]);
  return { items: docs.map(toOrderDto), meta: buildMeta(q.page, q.limit, total) };
}

export async function getOrder(shopId: string, id: string) {
  return toOrderDto(await loadOrder(shopId, id));
}

export async function getOrderStats(shopId: string) {
  const shop = sid(shopId);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [byStatusAgg, todayAgg] = await Promise.all([
    Order.aggregate<{ _id: OrderStatus; count: number }>([{ $match: { shopId: shop } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate<{ _id: null; orders: number; revenueMinor: number }>([
      { $match: { shopId: shop, createdAt: { $gte: startOfDay }, status: { $nin: ['CANCELLED', 'REJECTED'] } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenueMinor: { $sum: '$totalMinor' } } },
    ]),
  ]);
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const r of byStatusAgg) byStatus[r._id] = r.count;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return { total, byStatus, today: { orders: todayAgg[0]?.orders ?? 0, revenueMinor: todayAgg[0]?.revenueMinor ?? 0 } };
}

const STATUS_NOTIFY: Partial<Record<OrderStatus, { type: NotificationType; title: (n: string) => string; body: (n: string) => string }>> = {
  CONFIRMED: { type: 'ORDER_CONFIRMED', title: (n) => `Order ${n} confirmed`, body: (n) => `Good news! Your order ${n} has been confirmed.` },
  SHIPPED: { type: 'ORDER_SHIPPED', title: (n) => `Order ${n} shipped`, body: (n) => `Your order ${n} is on its way.` },
  DELIVERED: { type: 'ORDER_DELIVERED', title: (n) => `Order ${n} delivered`, body: (n) => `Your order ${n} has been delivered. Thank you for shopping with us!` },
  CANCELLED: { type: 'ORDER_CANCELLED', title: (n) => `Order ${n} cancelled`, body: (n) => `Your order ${n} has been cancelled.` },
  REJECTED: { type: 'ORDER_CANCELLED', title: (n) => `Order ${n} could not be accepted`, body: (n) => `Sorry, the shop could not accept your order ${n}.` },
};

/**
 * Validated status transition. CANCELLED/REJECTED return stock exactly once (RETURN txns, `stockRestored` flag set in the
 * same atomic unit as the status change, guarded by `status` + `stockRestored:false` in the update filter).
 * DELIVERED on a COD order marks the payment PAID.
 */
export async function updateOrderStatus(shopId: string, id: string, input: UpdateStatusInput, actor: Actor) {
  const order = await loadOrder(shopId, id);
  if (!ORDER_STATUS_TRANSITIONS[order.status].includes(input.status)) {
    throw Errors.badRequest('INVALID_ORDER_TRANSITION', `Cannot change order from ${order.status} to ${input.status}`);
  }
  const restore = STOCK_RESTORING_STATUSES.includes(input.status) && !order.stockRestored;
  const markCodPaid = input.status === 'DELIVERED' && order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID';

  const set: Record<string, unknown> = { status: input.status };
  if (restore) set.stockRestored = true;
  if (STOCK_RESTORING_STATUSES.includes(input.status) && input.note) set.cancelReason = input.note;
  const entry = { status: input.status, at: new Date(), by: sid(actor.userId), byLabel: actor.label ?? 'Staff', note: input.note };

  const restoredLines: Array<{ variantId: Types.ObjectId; qty: number }> = [];
  await runAtomic(async ({ session, onRollback }) => {
    restoredLines.length = 0;
    if (restore) {
      for (const item of order.items) {
        const after = await incrementStock(shopId, item.variantId, item.qty, session);
        if (!after) continue; // variant hard-deleted: nothing to restore
        restoredLines.push({ variantId: item.variantId, qty: item.qty });
        onRollback(async () => void (await decrementStock(shopId, item.variantId, item.qty)));
        await recordTransaction(
          { shopId, productId: item.productId, variantId: item.variantId, type: 'RETURN', quantity: item.qty, balanceAfter: after.stock, orderId: order._id, reason: `Order ${order.orderNumber} ${input.status.toLowerCase()}`, createdBy: actor.userId },
          session,
        );
      }
      onRollback(async () => void (await InventoryTransaction.deleteMany({ shopId: sid(shopId), orderId: order._id, type: 'RETURN' })));
    }
    // Atomic claim: only one concurrent caller can move the order out of `order.status`.
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, shopId: sid(shopId), status: order.status, ...(restore ? { stockRestored: false } : {}) },
      { $set: set, $push: { timeline: entry } },
      { new: true, session },
    );
    if (!updated) throw Errors.conflict('CONFLICT', 'The order was modified by someone else. Refresh and try again');
    if (restore && order.couponId) await releaseCoupon(shopId, order.couponId, session);
  });

  if (markCodPaid) {
    await applyPaymentPaid(shopId, order, { note: 'Cash collected on delivery', by: actor.userId, byLabel: actor.label ?? 'Staff' });
  }
  if (restore) await recomputeProducts(shopId, order.items.map((i) => String(i.productId)));

  const n = STATUS_NOTIFY[input.status];
  if (n) notifyCustomer(order, n.type, n.title(order.orderNumber), `${n.body(order.orderNumber)}${input.note ? ` Note: ${input.note}` : ''}`);
  void audit(
    { userId: actor.userId, shopId, ip: actor.ip },
    { action: 'order.status', entity: 'Order', entityId: order._id, before: { status: order.status }, after: { status: input.status }, meta: { note: input.note, stockRestored: restore } },
  );
  return getOrder(shopId, id);
}

/** Manual payment bookkeeping: PAID (cash/UPI received) or REFUNDED (optionally through the provider). */
export async function updateOrderPayment(shopId: string, id: string, input: UpdatePaymentInput, actor: Actor) {
  const order = await loadOrder(shopId, id);
  if (input.status === 'PAID') {
    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED') throw Errors.conflict('CONFLICT', `Payment is already ${order.paymentStatus}`);
    const changed = await applyPaymentPaid(shopId, order, { note: input.note ?? 'Payment marked as received', by: actor.userId, byLabel: actor.label ?? 'Staff' });
    if (!changed) {
      // No Payment doc in a payable state (legacy data): still reflect the manual action on the order.
      await Order.updateOne(
        { _id: order._id, shopId: sid(shopId) },
        { $set: { paymentStatus: 'PAID' }, $push: { timeline: { status: order.status, at: new Date(), by: sid(actor.userId), byLabel: actor.label ?? 'Staff', note: input.note ?? 'Payment marked as received' } } },
      );
      await Payment.updateMany({ shopId: sid(shopId), orderId: order._id, status: { $ne: 'REFUNDED' } }, { $set: { status: 'PAID' } });
    }
  } else {
    if (order.paymentStatus !== 'PAID') throw Errors.conflict('CONFLICT', 'Only a paid order can be refunded');
    await refundOrderPayment(shopId, order, { viaProvider: input.refundViaProvider, note: input.note, by: actor.userId });
  }
  void audit(
    { userId: actor.userId, shopId, ip: actor.ip },
    { action: `order.payment.${input.status.toLowerCase()}`, entity: 'Order', entityId: order._id, before: { paymentStatus: order.paymentStatus }, after: { paymentStatus: input.status }, meta: { note: input.note, amount: formatMoney(order.totalMinor, order.currency) } },
  );
  return getOrder(shopId, id);
}

export async function updateOrderNotes(shopId: string, id: string, input: UpdateNotesInput, actor: Actor) {
  const res = await Order.findOneAndUpdate({ _id: id, shopId: sid(shopId) }, { $set: { internalNote: input.internalNote } }, { new: true }).lean<IOrder>();
  if (!res) throw Errors.notFound('ORDER_NOT_FOUND', 'Order not found');
  logger.debug({ orderId: id }, 'order notes updated');
  void audit({ userId: actor.userId, shopId, ip: actor.ip }, { action: 'order.notes', entity: 'Order', entityId: id });
  return toOrderDto(res);
}
