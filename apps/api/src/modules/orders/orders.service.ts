import { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { audit } from '@/common/audit';
import { formatMoney } from '@/common/utils/money';
import { nextOrderNumber } from '@/common/utils/order-number';
import { normalisePhone } from '@/common/utils/phone';
import { logger } from '@/config/logger';
import { Customer, type ICustomer } from '@/database/models/customer.model';
import { Order, type IOrder, type IOrderItem } from '@/database/models/order.model';
import { Payment } from '@/database/models/payment.model';
import { Shop, type IShop } from '@/database/models/shop.model';
import { InventoryTransaction } from '@/database/models/inventory-transaction.model';
import { getPaymentProvider } from '@/providers/payments/factory';
import { notify } from '@/providers/notifications/notify.service';
import { recordEvent } from '@/modules/analytics/analytics.service';
import { computePricing } from '@/modules/cart/cart.service';
import { decrementStock, incrementStock, notifyStockCrossings, recomputeProducts, recordTransaction, type StockChange } from '@/modules/inventory/inventory.service';
import { runAtomic } from '@/modules/inventory/transaction';
import { claimCoupon, releaseCoupon } from '@/modules/offers/offers.service';
import { assertWithinLimit, incrementUsage } from '@/modules/subscriptions/limits.service';
import { notifyCustomer } from './orders.helpers';
import type { PlaceOrderInput, TrackOrderInput } from './orders.schemas';

// Mirrors apps/web/src/types/storefront.ts
export interface PlaceOrderResponse {
  orderNumber: string;
  orderId: string;
  totalMinor: number;
  paymentStatus: string;
  status: string;
  payment?: { provider: string; providerOrderId: string; clientPayload: Record<string, unknown> };
}
export interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: IOrder['paymentMethod'];
  totalMinor: number;
  currency: string;
  createdAt: string;
  items: { name: string; colour?: string; size?: string; quantity: number; unitPriceMinor: number; imageUrl?: string }[];
  timeline: { status: string; at: string; note?: string }[];
}

export interface CreateOrderContext {
  ip?: string;
  customerUserId?: string;
  source: 'STOREFRONT' | 'DASHBOARD';
  /** Staff creating the order (DASHBOARD). */
  actor?: { userId: string; label?: string };
  /** DASHBOARD only: the customer already paid in full. */
  markPaid?: boolean;
}

type CreateOrderInput = Omit<PlaceOrderInput, 'paymentMethod' | 'website'> & { paymentMethod: PlaceOrderInput['paymentMethod']; website?: string };

const sid = (v: string): Types.ObjectId => new Types.ObjectId(v);

/** Guest storefront checkout. See ARCHITECTURE §5. */
export function placeGuestOrder(shopId: string, input: PlaceOrderInput, ctx: { ip?: string; customerUserId?: string; userAgent?: string }): Promise<PlaceOrderResponse> {
  // userAgent is accepted for caller convenience; the order model does not store it.
  return createOrder(shopId, input, { ip: ctx.ip, customerUserId: ctx.customerUserId, source: 'STOREFRONT' });
}
/** Finds or creates the customer (unique per shop+phone). Plan limit is only checked when a NEW customer is needed. */
async function upsertCustomer(
  shopId: string,
  input: CreateOrderInput,
  phone: string,
  userId?: string,
): Promise<{ customer: ICustomer; created: boolean }> {
  const existing = await Customer.findOne({ shopId: sid(shopId), phone }).lean<ICustomer>();
  if (existing) {
    if (existing.isBlocked) throw Errors.forbidden('This customer cannot place orders', 'FORBIDDEN');
    const $set: Record<string, unknown> = {};
    if (input.customer.email && !existing.email) $set.email = input.customer.email;
    if (userId && !existing.userId) $set.userId = sid(userId);
    if (Object.keys($set).length) await Customer.updateOne({ _id: existing._id }, { $set });
    return { customer: existing, created: false };
  }
  await assertWithinLimit(shopId, 'customers');
  try {
    const customer = await Customer.create({
      shopId: sid(shopId),
      name: input.customer.name,
      phone,
      email: input.customer.email,
      userId: userId ? sid(userId) : null,
      source: 'ORDER',
    });
    return { customer: customer.toObject() as ICustomer, created: true };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      // Lost a race with a concurrent order from the same phone.
      const again = await Customer.findOne({ shopId: sid(shopId), phone }).lean<ICustomer>();
      if (again) return { customer: again, created: false };
    }
    throw err;
  }
}

function assertPaymentAllowed(shop: IShop, input: CreateOrderInput, source: CreateOrderContext['source']): void {
  if (source === 'STOREFRONT') {
    const s = shop.paymentSettings;
    const enabled = input.paymentMethod === 'ONLINE' ? s.onlineEnabled : input.paymentMethod === 'COD' ? s.codEnabled : s.payAtShopEnabled;
    if (!enabled) throw Errors.badRequest('PAYMENT_METHOD_DISABLED', 'This payment method is not available for this shop');
    const d = shop.shippingSettings;
    if (input.deliveryType === 'DELIVERY' && !d.deliveryEnabled) throw Errors.badRequest('VALIDATION_ERROR', 'Home delivery is not available for this shop');
    if (input.deliveryType === 'PICKUP' && !d.pickupEnabled) throw Errors.badRequest('VALIDATION_ERROR', 'Store pickup is not available for this shop');
  }
}

/** The order engine (guest + dashboard). Server recomputes everything; client prices are never accepted. */
export async function createOrder(shopId: string, input: CreateOrderInput, ctx: CreateOrderContext): Promise<PlaceOrderResponse> {
  if (input.website && input.website.trim() !== '') throw Errors.badRequest('VALIDATION_ERROR', 'Invalid request');

  const shop = await Shop.findById(shopId).lean<IShop>();
  if (!shop || shop.status === 'PENDING') throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  if (shop.status === 'SUSPENDED') throw Errors.forbidden('This shop is currently unavailable', 'SHOP_SUSPENDED');
  assertPaymentAllowed(shop, input, ctx.source);

  const phone = normalisePhone(input.customer.phone);
  const priced = await computePricing(shop, { items: input.items, couponCode: input.couponCode }, { deliveryType: input.deliveryType, phone });

  const bad = priced.cart.lines.find((l) => !l.available);
  if (bad) {
    const label = [bad.name, bad.colour, bad.size].filter(Boolean).join(' / ');
    switch (bad.issue) {
      case 'OUT_OF_STOCK':
        throw Errors.conflict('OUT_OF_STOCK', `${label} is out of stock`);
      case 'INSUFFICIENT_STOCK':
        throw Errors.conflict('INSUFFICIENT_STOCK', `Only ${bad.maxQuantity} left of ${label}`);
      case 'PRICE_HIDDEN':
        throw Errors.badRequest('INVALID_VARIANT', `${bad.name} cannot be ordered online. Please enquire with the shop`);
      default:
        throw Errors.badRequest('INVALID_VARIANT', 'An item in your cart is no longer available');
    }
  }
  if (priced.cart.coupon && !priced.cart.coupon.valid) throw Errors.badRequest('COUPON_INVALID', priced.cart.coupon.message ?? 'Invalid coupon');
  const total = priced.cart.totalMinor;
  if (input.paymentMethod === 'ONLINE' && total <= 0) throw Errors.badRequest('VALIDATION_ERROR', 'Nothing to pay online for this order');

  await assertWithinLimit(shopId, 'ordersPerMonth');
  const { customer, created: customerCreated } = await upsertCustomer(shopId, input, phone, ctx.customerUserId);

  const orderId = new Types.ObjectId();
  const orderNumber = await nextOrderNumber(shopId, shop.orderPrefix);

  // External call BEFORE touching stock so a provider outage never leaves reserved stock behind.
  let providerOrder: { provider: string; providerOrderId: string; clientPayload: Record<string, unknown> } | undefined;
  if (input.paymentMethod === 'ONLINE' && ctx.source === 'STOREFRONT') {
    const provider = getPaymentProvider();
    const r = await provider.createOrder({ amountMinor: total, currency: shop.currency, receipt: orderNumber, notes: { shopId, orderNumber } });
    providerOrder = { provider: provider.name, providerOrderId: r.providerOrderId, clientPayload: r.clientPayload };
  }

  const paymentStatus = ctx.markPaid ? 'PAID' : input.paymentMethod === 'COD' ? 'COD' : 'PENDING';
  const byLabel = ctx.source === 'DASHBOARD' ? (ctx.actor?.label ?? 'Staff') : 'Customer';
  const items: IOrderItem[] = priced.lines.map((l) => ({
    productId: sid(l.productId),
    variantId: sid(l.variantId),
    name: l.name,
    sku: l.sku || undefined,
    colour: l.colour,
    size: l.size,
    imageUrl: l.imageUrl,
    unitPriceMinor: l.unitPriceMinor,
    mrpMinor: l.mrpMinor ?? 0,
    qty: l.quantity,
    discountMinor: l.discountMinor,
    taxPercent: l.taxPercent,
    taxMinor: l.taxMinor,
    lineTotalMinor: l.lineTotalMinor,
  }));

  const stockChanges: StockChange[] = [];
  const order = await runAtomic(async ({ session, onRollback }) => {
    stockChanges.length = 0; // the callback can be retried inside a transaction

    // 1) atomically decrement stock per line (conditional on stock >= qty), logging SALE transactions
    for (const l of priced.lines) {
      const after = await decrementStock(shopId, l.variantId, l.quantity, session);
      if (!after) {
        const label = [l.name, l.colour, l.size].filter(Boolean).join(' / ');
        throw Errors.conflict('INSUFFICIENT_STOCK', `Not enough stock for ${label}. Please review your cart`);
      }
      onRollback(async () => void (await incrementStock(shopId, l.variantId, l.quantity)));
      if (after.sellingPriceMinor !== l.unitPriceMinor) throw Errors.conflict('CONFLICT', 'Prices changed while you were checking out. Please review your cart');
      await recordTransaction(
        { shopId, productId: after.productId, variantId: after._id, type: 'SALE', quantity: -l.quantity, balanceAfter: after.stock, orderId, reason: `Order ${orderNumber}`, createdBy: ctx.actor?.userId },
        session,
      );
      stockChanges.push({ variantId: l.variantId, productId: l.productId, before: after.stock + l.quantity, after: after.stock, variantThreshold: after.lowStockThreshold });
    }
    onRollback(async () => void (await InventoryTransaction.deleteMany({ shopId: sid(shopId), orderId })));

    // 2) coupon use (respects usageLimit atomically)
    if (priced.couponId) {
      if (!(await claimCoupon(shopId, priced.couponId, session))) throw Errors.badRequest('COUPON_INVALID', 'This coupon has reached its usage limit');
      onRollback(() => releaseCoupon(shopId, priced.couponId as string));
    }

    // 3) order + payment
    const [created] = await Order.create(
      [
        {
          _id: orderId,
          shopId: sid(shopId),
          orderNumber,
          customerId: customer._id,
          customerSnapshot: { name: input.customer.name, phone, email: input.customer.email },
          items,
          deliveryType: input.deliveryType,
          address:
            input.deliveryType === 'DELIVERY' && input.address
              ? { name: input.customer.name, phone, ...input.address }
              : undefined,
          subtotalMinor: priced.cart.subtotalMinor,
          discountMinor: priced.cart.discountMinor,
          taxMinor: priced.cart.taxMinor,
          shippingMinor: priced.cart.shippingMinor,
          totalMinor: total,
          currency: shop.currency,
          couponCode: priced.couponId ? priced.cart.coupon?.code : undefined,
          couponId: priced.couponId ? sid(priced.couponId) : null,
          paymentMethod: input.paymentMethod,
          paymentStatus,
          status: 'PENDING',
          timeline: [{ status: 'PENDING', at: new Date(), by: ctx.actor ? sid(ctx.actor.userId) : null, byLabel, note: 'Order placed' }],
          customerNote: input.notes,
          stockRestored: false,
          source: ctx.source,
          placedByIp: ctx.ip,
        },
      ],
      { session },
    );
    onRollback(async () => void (await Order.deleteOne({ _id: orderId })));
    const [paymentDoc] = await Payment.create(
      [
        {
          shopId: sid(shopId),
          orderId,
          provider: providerOrder?.provider ?? (input.paymentMethod === 'COD' ? 'cod' : 'shop'),
          method: input.paymentMethod,
          providerOrderId: providerOrder?.providerOrderId,
          amountMinor: total,
          currency: shop.currency,
          status: paymentStatus,
        },
      ],
      { session },
    );
    onRollback(async () => void (await Payment.deleteOne({ _id: paymentDoc._id })));
    return created;
  });

  await postOrderCreated(shop, order, customer, customerCreated, stockChanges, priced.lines.map((l) => l.productId), ctx);

  return {
    orderNumber,
    orderId: String(orderId),
    totalMinor: total,
    paymentStatus,
    status: 'PENDING',
    ...(providerOrder ? { payment: providerOrder } : {}),
  };
}

/** Everything after the commit. Accounting is awaited (cheap, logged on failure); notifications/analytics are fire-and-forget. */
async function postOrderCreated(
  shop: IShop,
  order: IOrder,
  customer: ICustomer,
  customerCreated: boolean,
  stockChanges: StockChange[],
  productIds: string[],
  ctx: CreateOrderContext,
): Promise<void> {
  const shopId = String(shop._id);
  try {
    await incrementUsage(shopId, 'ordersPerMonth');
    if (customerCreated) await incrementUsage(shopId, 'customers');
    await Customer.updateOne(
      { _id: customer._id },
      { $inc: { 'stats.ordersCount': 1, 'stats.totalSpentMinor': order.totalMinor }, $set: { 'stats.lastOrderAt': new Date() } },
    );
  } catch (err) {
    logger.error({ err, orderNumber: order.orderNumber }, 'post-order accounting failed');
  }
  await recomputeProducts(shopId, productIds);

  void notifyStockCrossings(shopId, stockChanges);
  void notify({
    shopId,
    type: 'ORDER_NEW',
    title: `New order ${order.orderNumber}`,
    body: `${order.customerSnapshot.name} placed an order for ${formatMoney(order.totalMinor, order.currency)} (${order.items.length} item${order.items.length === 1 ? '' : 's'}, ${order.paymentMethod}).`,
    data: { orderId: String(order._id), orderNumber: order.orderNumber },
    channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
  });
  notifyCustomer(order, 'ORDER_PLACED', `Order ${order.orderNumber} placed`, `Thank you ${order.customerSnapshot.name}! Your order ${order.orderNumber} of ${formatMoney(order.totalMinor, order.currency)} was received by ${shop.name}.`);
  void Promise.resolve()
    .then(() => recordEvent(shopId, { type: 'ORDER', meta: { orderNumber: order.orderNumber, totalMinor: order.totalMinor, source: ctx.source } }))
    .catch((err: unknown) => logger.warn({ err }, 'recordEvent ORDER failed'));
  void audit(
    { userId: ctx.actor?.userId, shopId, ip: ctx.ip },
    { action: 'order.create', entity: 'Order', entityId: order._id, after: { orderNumber: order.orderNumber, totalMinor: order.totalMinor, paymentMethod: order.paymentMethod, source: ctx.source } },
  );
}

/** Public tracking. Wrong number and wrong phone return the same 404 (no enumeration). */
export async function trackOrder(shopId: string, orderNumber: string, phone: string): Promise<TrackedOrder> {
  const notFound = Errors.notFound('ORDER_NOT_FOUND', 'Order not found. Check the order number and phone number');
  const order = await Order.findOne({ shopId: sid(shopId), orderNumber: orderNumber.trim().toUpperCase() }).lean<IOrder>();
  if (!order) throw notFound;
  if (normalisePhone(order.customerSnapshot.phone) !== normalisePhone(phone)) throw notFound;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    totalMinor: order.totalMinor,
    currency: order.currency,
    createdAt: new Date(order.createdAt).toISOString(),
    items: order.items.map((i) => ({ name: i.name, colour: i.colour, size: i.size, quantity: i.qty, unitPriceMinor: i.unitPriceMinor, imageUrl: i.imageUrl })),
    timeline: order.timeline.map((t) => ({ status: t.status, at: new Date(t.at).toISOString(), note: t.note })),
  };
}

export type { TrackOrderInput };
