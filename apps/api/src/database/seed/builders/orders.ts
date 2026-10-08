import type { OrderStatus, PaymentMethod, PaymentStatus } from '@vastra/shared';
import type { Types } from 'mongoose';
import { nextOrderNumber } from '@/common/utils/order-number';
import type { ICoupon } from '@/database/models/coupon.model';
import type { IOrder, IOrderItem, IOrderTimelineEntry } from '@/database/models/order.model';
import type { IPayment } from '@/database/models/payment.model';
import { CANCEL_REASONS, REJECT_REASONS } from '../data/customers';
import { DAY_MS, HOUR_MS, type Rng } from '../prng';
import type { BuiltProduct, ShopContext } from '../types';
import { idStr, inclusiveTax, newId } from '../util';
import type { CustomerPlan } from './customers';

export interface StockEvent {
  variantId: Types.ObjectId;
  productId: Types.ObjectId;
  type: 'SALE' | 'RETURN' | 'DAMAGE';
  /** Signed delta. */
  quantity: number;
  orderId?: Types.ObjectId;
  at: Date;
  reason: string;
}

export interface OrderPlan { orders: IOrder[]; payments: IPayment[]; events: StockEvent[] }

const DELIVERY_PATH: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const PICKUP_PATH: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'DELIVERED'];
const DEAD: readonly OrderStatus[] = ['CANCELLED', 'REJECTED'];

function pickStatus(rng: Rng, ageDays: number): OrderStatus {
  if (ageDays > 14) return rng.weighted<OrderStatus>([['DELIVERED', 80], ['CANCELLED', 12], ['REJECTED', 5], ['SHIPPED', 3]]);
  if (ageDays > 3) {
    return rng.weighted<OrderStatus>([['DELIVERED', 40], ['OUT_FOR_DELIVERY', 10], ['SHIPPED', 15], ['PROCESSING', 10], ['CONFIRMED', 10], ['CANCELLED', 8], ['REJECTED', 2], ['PENDING', 5]]);
  }
  return rng.weighted<OrderStatus>([['PENDING', 38], ['CONFIRMED', 26], ['PROCESSING', 20], ['SHIPPED', 11], ['CANCELLED', 5]]);
}

function statusPath(rng: Rng, target: OrderStatus, pickup: boolean): OrderStatus[] {
  const path = pickup ? PICKUP_PATH : DELIVERY_PATH;
  if (target === 'REJECTED') return ['PENDING', 'REJECTED'];
  if (target === 'CANCELLED') return [...path.slice(0, rng.int(1, Math.min(4, path.length - 2)) ), 'CANCELLED'];
  let t = target;
  if (pickup && t === 'OUT_FOR_DELIVERY') t = 'READY_FOR_PICKUP';
  if (pickup && t === 'SHIPPED') t = 'PROCESSING';
  if (!pickup && t === 'READY_FOR_PICKUP') t = 'SHIPPED';
  return path.slice(0, path.indexOf(t) + 1);
}

function paymentStatusFor(rng: Rng, method: PaymentMethod, status: OrderStatus): PaymentStatus {
  if (method === 'COD') return status === 'DELIVERED' ? 'PAID' : 'COD';
  if (method === 'PAY_AT_SHOP') return status === 'DELIVERED' ? 'PAID' : 'PENDING';
  if (status === 'REJECTED') return 'FAILED';
  if (status === 'CANCELLED') return rng.chance(0.7) ? 'REFUNDED' : 'FAILED';
  if (status === 'PENDING') return rng.chance(0.5) ? 'PAID' : 'PENDING';
  return 'PAID';
}

export async function planOrders(
  ctx: ShopContext, rng: Rng, now: Date, built: BuiltProduct[], customerPlan: CustomerPlan, coupon: ICoupon, offerStartsAt: Date,
): Promise<OrderPlan> {
  const { def, shopId, ownerId, ownerName } = ctx;
  const sellable = built.filter((b) => b.product.status !== 'DRAFT');
  const customers = customerPlan.customers;

  // Chronological placement times so order numbers ascend with time.
  const times: number[] = [];
  for (let i = 0; i < def.orderCount; i++) {
    const ageMs = Math.floor(rng.next() ** 1.15 * 59 * DAY_MS) + rng.int(2, 20) * HOUR_MS;
    times.push(now.getTime() - ageMs);
  }
  times.sort((a, b) => a - b);

  const orders: IOrder[] = [];
  const payments: IPayment[] = [];
  const events: StockEvent[] = [];

  for (let i = 0; i < times.length; i++) {
    const placedAt = new Date(times[i]);
    const ageDays = (now.getTime() - times[i]) / DAY_MS;
    const customer = i % 9 === 0 ? customers[0] : customers[Math.floor(rng.next() ** 2 * customers.length)];
    const addr = customerPlan.addressesOf.get(idStr(customer._id))?.[0];
    const orderId = newId();

    const pickup = rng.chance(0.2);
    const target = pickStatus(rng, ageDays);
    const path = statusPath(rng, target, pickup);
    const status = path[path.length - 1];
    const dead = DEAD.includes(status);
    // Dead orders avoid out-of-stock products so returns never resurrect them.
    const pool = dead ? sellable.filter((b) => b.spec.stock !== 'out') : sellable;

    // Items: 1-3 distinct variants.
    const items: IOrderItem[] = [];
    const used = new Set<string>();
    const nLines = rng.weighted<number>([[1, 55], [2, 33], [3, 12]]);
    for (let l = 0; l < nLines; l++) {
      const b = rng.pick(pool);
      const v = rng.pick(b.variants);
      if (used.has(idStr(v._id))) continue;
      used.add(idStr(v._id));
      const qty = b.spec.type === 'SAREE' ? 1 : rng.weighted<number>([[1, 78], [2, 17], [3, 5]]);
      items.push({
        productId: b.product._id, variantId: v._id, name: b.product.name, sku: v.sku, colour: v.colour?.name, size: v.size, imageUrl: v.imageUrl,
        unitPriceMinor: v.sellingPriceMinor, mrpMinor: v.mrpMinor, qty, discountMinor: 0, taxPercent: b.product.pricing.taxPercent, taxMinor: 0, lineTotalMinor: 0,
      });
    }

    // Discount (offer or coupon, never both), distributed over lines like cart.service.
    const subtotal = items.reduce((n, it) => n + it.unitPriceMinor * it.qty, 0);
    const kind = rng.weighted<'none' | 'offer' | 'coupon'>([['none', 60], ['offer', 20], ['coupon', 20]]);
    let discount = 0;
    let couponCode: string | undefined;
    if (kind === 'offer' && placedAt >= offerStartsAt) discount = Math.floor((subtotal * 10) / 100);
    if (kind === 'coupon' && subtotal >= coupon.minOrderMinor) {
      discount = Math.min(Math.floor((subtotal * coupon.value) / 100), coupon.maxDiscountMinor ?? Infinity);
      couponCode = coupon.code;
    }
    let left = discount;
    items.forEach((it, idx) => {
      const gross = it.unitPriceMinor * it.qty;
      it.discountMinor = idx === items.length - 1 ? left : Math.floor((discount * gross) / subtotal);
      left -= it.discountMinor;
      it.lineTotalMinor = gross - it.discountMinor;
      it.taxMinor = inclusiveTax(it.lineTotalMinor, it.taxPercent);
    });

    const shipping = pickup || subtotal - discount >= ctx.freeAboveMinor ? 0 : ctx.flatRateMinor;
    const total = subtotal - discount + shipping;
    const method: PaymentMethod = pickup ? rng.weighted<PaymentMethod>([['PAY_AT_SHOP', 65], ['ONLINE', 35]]) : rng.weighted<PaymentMethod>([['COD', 58], ['ONLINE', 42]]);

    const timeline: IOrderTimelineEntry[] = [];
    let t = placedAt.getTime();
    path.forEach((s, idx) => {
      if (idx > 0) t = Math.min(t + rng.int(2, 30) * HOUR_MS, now.getTime() - 60_000);
      timeline.push({
        status: s, at: new Date(t), by: idx === 0 ? null : ownerId, byLabel: idx === 0 ? 'Customer' : ownerName,
        note: idx === 0 ? 'Order placed' : s === 'CANCELLED' ? rng.pick(CANCEL_REASONS) : s === 'REJECTED' ? rng.pick(REJECT_REASONS) : undefined,
      });
    });
    const last = timeline[timeline.length - 1];
    const paymentStatus = paymentStatusFor(rng, method, status);
    const orderNumber = await nextOrderNumber(idStr(shopId), def.prefix, placedAt);

    orders.push({
      _id: orderId, shopId, orderNumber, customerId: customer._id, customerSnapshot: { name: customer.name, phone: customer.phone, email: customer.email },
      items, deliveryType: pickup ? 'PICKUP' : 'DELIVERY',
      address: !pickup && addr ? { name: addr.name, phone: addr.phone, line1: addr.line1, line2: addr.line2, landmark: addr.landmark, city: addr.city, state: addr.state, pincode: addr.pincode, country: 'IN' } : undefined,
      subtotalMinor: subtotal, discountMinor: discount, taxMinor: items.reduce((n, it) => n + it.taxMinor, 0), shippingMinor: shipping, totalMinor: total, currency: ctx.currency,
      couponCode, couponId: couponCode ? coupon._id : null, paymentMethod: method, paymentStatus, status, timeline,
      customerNote: rng.chance(0.12) ? 'Please pack it as a gift.' : undefined, internalNote: rng.chance(0.08) ? 'Customer asked for a call before dispatch.' : undefined,
      cancelReason: status === 'CANCELLED' || status === 'REJECTED' ? last.note : undefined, stockRestored: dead, source: rng.chance(0.1) ? 'DASHBOARD' : 'STOREFRONT',
      placedByIp: '203.0.113.' + rng.int(1, 250), createdAt: placedAt, updatedAt: last.at,
    });

    payments.push({
      _id: newId(), shopId, orderId, provider: method === 'ONLINE' ? 'razorpay' : method === 'COD' ? 'cod' : 'shop', method,
      providerOrderId: method === 'ONLINE' ? `order_seed_${orderNumber}` : undefined,
      providerPaymentId: method === 'ONLINE' && (paymentStatus === 'PAID' || paymentStatus === 'REFUNDED') ? `pay_seed_${orderNumber}` : undefined,
      amountMinor: total, refundedMinor: paymentStatus === 'REFUNDED' ? total : 0, currency: ctx.currency, status: paymentStatus,
      failureReason: paymentStatus === 'FAILED' ? 'Payment not completed' : undefined, processedEventIds: [], meta: { seed: true }, createdAt: placedAt, updatedAt: last.at,
    });

    for (const it of items) {
      events.push({ variantId: it.variantId, productId: it.productId, type: 'SALE', quantity: -it.qty, orderId, at: placedAt, reason: `Order ${orderNumber}` });
      if (dead) events.push({ variantId: it.variantId, productId: it.productId, type: 'RETURN', quantity: it.qty, orderId, at: last.at, reason: `Stock restored: ${orderNumber} ${status.toLowerCase()}` });
    }
  }
  return { orders, payments, events };
}

/** Applies live (non-cancelled/rejected) order totals to customers, coupon usage and product sold counters. */
export function applyOrderAggregates(orders: IOrder[], customerPlan: CustomerPlan, built: BuiltProduct[], coupon: ICoupon): void {
  const byCustomer = new Map(customerPlan.customers.map((c) => [idStr(c._id), c]));
  const byProduct = new Map(built.map((b) => [idStr(b.product._id), b.product]));
  const firstOrder = new Map<string, Date>();
  for (const o of orders) {
    const c = o.customerId ? byCustomer.get(idStr(o.customerId)) : undefined;
    if (c) {
      const seen = firstOrder.get(idStr(c._id));
      if (!seen || o.createdAt < seen) firstOrder.set(idStr(c._id), o.createdAt);
    }
    if (DEAD.includes(o.status)) continue;
    if (c) {
      c.stats.ordersCount += 1;
      c.stats.totalSpentMinor += o.totalMinor;
      if (!c.stats.lastOrderAt || o.createdAt > c.stats.lastOrderAt) c.stats.lastOrderAt = o.createdAt;
    }
    if (o.couponCode) coupon.usedCount += 1;
    for (const it of o.items) {
      const p = byProduct.get(idStr(it.productId));
      if (p) p.soldCount += it.qty;
    }
  }
  for (const c of customerPlan.customers) {
    const first = firstOrder.get(idStr(c._id));
    if (first) {
      c.createdAt = first < c.createdAt ? first : c.createdAt;
      c.updatedAt = c.stats.lastOrderAt ?? c.createdAt;
      if (c.source !== 'ACCOUNT') c.source = 'ORDER';
    }
  }
}
