import { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { audit } from '@/common/audit';
import { logger } from '@/config/logger';
import { Order, type IOrder } from '@/database/models/order.model';
import { Payment, type IPayment } from '@/database/models/payment.model';
import { getPaymentProvider } from '@/providers/payments/factory';
import { notify } from '@/providers/notifications/notify.service';
import { formatMoney } from '@/common/utils/money';

export type WebhookProvider = 'razorpay' | 'stripe';

interface PaidOpts {
  providerPaymentId?: string;
  eventId?: string;
  /** Timeline label, e.g. "Online payment received". */
  note: string;
  by?: string;
  byLabel?: string;
}

const sid = (v: string): Types.ObjectId => new Types.ObjectId(v);

async function latestPayment(shopId: string, orderId: Types.ObjectId): Promise<IPayment | null> {
  return Payment.findOne({ shopId: sid(shopId), orderId }).sort({ createdAt: -1 }).lean<IPayment>();
}

/**
 * Idempotently marks the order's payment PAID. Returns true when this call performed the transition.
 * Atomic on the Payment doc (`status != PAID`), so concurrent webhook + client verify cannot double-apply.
 */
export async function applyPaymentPaid(shopId: string, order: Pick<IOrder, '_id' | 'orderNumber' | 'status' | 'totalMinor' | 'currency'>, opts: PaidOpts): Promise<boolean> {
  const set: Record<string, unknown> = { status: 'PAID' };
  if (opts.providerPaymentId) set.providerPaymentId = opts.providerPaymentId;
  const payment = await Payment.findOneAndUpdate(
    { shopId: sid(shopId), orderId: order._id, status: { $in: ['PENDING', 'FAILED', 'COD'] } },
    { $set: set, ...(opts.eventId ? { $addToSet: { processedEventIds: opts.eventId } } : {}) },
    { new: true, sort: { createdAt: -1 } },
  ).lean();
  if (!payment) return false;

  await Order.updateOne(
    { _id: order._id, shopId: sid(shopId) },
    {
      $set: { paymentStatus: 'PAID' },
      $push: { timeline: { status: order.status, at: new Date(), by: opts.by ? sid(opts.by) : null, byLabel: opts.byLabel ?? 'Payment', note: opts.note } },
    },
  );
  void notify({
    shopId,
    type: 'PAYMENT_RECEIVED',
    title: `Payment received for ${order.orderNumber}`,
    body: `${formatMoney(order.totalMinor, order.currency)} received for order ${order.orderNumber}.`,
    data: { orderId: String(order._id), orderNumber: order.orderNumber },
    channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
  });
  void audit({ userId: opts.by, shopId }, { action: 'payment.paid', entity: 'Order', entityId: order._id, after: { paymentStatus: 'PAID' }, meta: { note: opts.note } });
  return true;
}

/** Idempotently marks an ONLINE payment FAILED (only while PENDING; a PAID payment is never downgraded). */
export async function applyPaymentFailed(shopId: string, order: Pick<IOrder, '_id' | 'status'>, opts: { reason?: string; eventId?: string }): Promise<boolean> {
  const payment = await Payment.findOneAndUpdate(
    { shopId: sid(shopId), orderId: order._id, status: 'PENDING', method: 'ONLINE' },
    { $set: { status: 'FAILED', failureReason: opts.reason }, ...(opts.eventId ? { $addToSet: { processedEventIds: opts.eventId } } : {}) },
    { new: true, sort: { createdAt: -1 } },
  ).lean();
  if (!payment) return false;
  await Order.updateOne(
    { _id: order._id, shopId: sid(shopId), paymentStatus: 'PENDING' },
    { $set: { paymentStatus: 'FAILED' }, $push: { timeline: { status: order.status, at: new Date(), byLabel: 'Payment', note: `Online payment failed${opts.reason ? `: ${opts.reason}` : ''}` } } },
  );
  return true;
}

/**
 * Called by the storefront after the client finished checkout. The provider re-verifies the signature / intent
 * status server-side; the payload must also reference THIS order's provider order id.
 */
export async function verifyAndMarkPaid(
  shopId: string,
  input: { orderNumber: string; payload: Record<string, unknown> },
): Promise<{ orderNumber: string; paymentStatus: string }> {
  const order = await Order.findOne({ shopId: sid(shopId), orderNumber: input.orderNumber.trim().toUpperCase() }).lean<IOrder>();
  if (!order || order.paymentMethod !== 'ONLINE') throw Errors.notFound('ORDER_NOT_FOUND', 'Order not found');
  if (order.paymentStatus === 'PAID') return { orderNumber: order.orderNumber, paymentStatus: 'PAID' };

  const payment = await latestPayment(shopId, order._id);
  if (!payment?.providerOrderId) throw Errors.badRequest('PAYMENT_FAILED', 'No payment is pending for this order');
  const referencesOrder = Object.values(input.payload).some((v) => v === payment.providerOrderId);
  if (!referencesOrder) throw Errors.badRequest('PAYMENT_FAILED', 'Payment does not belong to this order');

  const provider = getPaymentProvider();
  if (provider.name !== payment.provider) throw Errors.badRequest('PAYMENT_FAILED', 'Payment provider mismatch');
  const result = await provider.verifyPayment(input.payload);
  if (!result.ok) throw Errors.badRequest('PAYMENT_FAILED', 'Payment could not be verified');

  await applyPaymentPaid(shopId, order, { providerPaymentId: result.providerPaymentId, note: 'Online payment verified', byLabel: 'Customer' });
  const fresh = await Order.findById(order._id).select('paymentStatus orderNumber').lean();
  return { orderNumber: order.orderNumber, paymentStatus: fresh?.paymentStatus ?? 'PAID' };
}

interface ParsedEvent {
  eventId: string;
  outcome: 'PAID' | 'FAILED' | 'IGNORE';
  providerOrderId?: string;
  providerPaymentId?: string;
  reason?: string;
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- untrusted webhook JSON, narrowed field by field

function parseRazorpay(body: Json): ParsedEvent {
  const event = String(body.event ?? '');
  const pay = body.payload?.payment?.entity as Json | undefined;
  const ord = body.payload?.order?.entity as Json | undefined;
  const providerOrderId = (pay?.order_id ?? ord?.id) as string | undefined;
  const providerPaymentId = pay?.id as string | undefined;
  const eventId = `${event}:${providerPaymentId ?? providerOrderId ?? ''}`;
  if (event === 'payment.captured' || event === 'order.paid') return { eventId, outcome: 'PAID', providerOrderId, providerPaymentId };
  if (event === 'payment.failed') return { eventId, outcome: 'FAILED', providerOrderId, providerPaymentId, reason: pay?.error_description };
  return { eventId, outcome: 'IGNORE' };
}

function parseStripe(body: Json): ParsedEvent {
  const eventId = String(body.id ?? '');
  const obj = body.data?.object as Json | undefined;
  if (body.type === 'payment_intent.succeeded') return { eventId, outcome: 'PAID', providerOrderId: obj?.id, providerPaymentId: obj?.id };
  if (body.type === 'payment_intent.payment_failed')
    return { eventId, outcome: 'FAILED', providerOrderId: obj?.id, providerPaymentId: obj?.id, reason: obj?.last_payment_error?.message };
  return { eventId, outcome: 'IGNORE' };
}

/**
 * Verifies the signature against the RAW body, then applies the event idempotently.
 * Returns `{ handled }` for the HTTP layer (always 200 for authentic events so providers do not retry forever).
 */
export async function handleWebhook(provider: WebhookProvider, rawBody: Buffer | string, signature: string): Promise<{ handled: boolean }> {
  const active = getPaymentProvider();
  if (active.name !== provider || !active.verifyWebhook(rawBody, signature)) throw Errors.unauthorized('Invalid webhook signature', 'UNAUTHORIZED');

  let body: Json;
  try {
    body = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')) as Json;
  } catch {
    throw Errors.badRequest('VALIDATION_ERROR', 'Invalid webhook payload');
  }
  const ev = provider === 'razorpay' ? parseRazorpay(body) : parseStripe(body);
  if (ev.outcome === 'IGNORE' || !ev.providerOrderId) return { handled: false };

  const payment = await Payment.findOne({ provider, providerOrderId: ev.providerOrderId }).lean<IPayment>();
  if (!payment) {
    logger.warn({ provider, providerOrderId: ev.providerOrderId }, 'webhook for unknown payment');
    return { handled: false };
  }
  if (ev.eventId && payment.processedEventIds.includes(ev.eventId)) return { handled: true };

  const shopId = String(payment.shopId);
  const order = await Order.findOne({ _id: payment.orderId, shopId: payment.shopId }).lean<IOrder>();
  if (!order) return { handled: false };

  if (ev.outcome === 'PAID') {
    await applyPaymentPaid(shopId, order, { providerPaymentId: ev.providerPaymentId, eventId: ev.eventId, note: 'Online payment received', byLabel: provider });
  } else {
    await applyPaymentFailed(shopId, order, { reason: ev.reason, eventId: ev.eventId });
  }
  await Payment.updateOne({ _id: payment._id }, { $addToSet: { processedEventIds: ev.eventId } });
  return { handled: true };
}

/**
 * Refund helper. With `viaProvider` the provider refund API is called (ONLINE payments with a provider payment id);
 * otherwise the refund is only recorded (money returned manually / in cash).
 */
export async function refundOrderPayment(
  shopId: string,
  order: Pick<IOrder, '_id' | 'status' | 'totalMinor'>,
  opts: { viaProvider?: boolean; amountMinor?: number; note?: string; by?: string },
): Promise<void> {
  const payment = await latestPayment(shopId, order._id);
  const amount = opts.amountMinor ?? order.totalMinor;
  if (amount <= 0 || amount > order.totalMinor) throw Errors.badRequest('VALIDATION_ERROR', 'Invalid refund amount');
  if (opts.viaProvider) {
    if (!payment || payment.method !== 'ONLINE' || !payment.providerPaymentId) throw Errors.badRequest('PAYMENT_FAILED', 'No online payment to refund through the provider');
    const provider = getPaymentProvider();
    if (provider.name !== payment.provider) throw Errors.badRequest('PAYMENT_FAILED', 'Payment provider mismatch');
    await provider.refund(payment.providerPaymentId, amount === order.totalMinor ? undefined : amount);
  }
  if (payment) {
    await Payment.updateOne({ _id: payment._id }, { $set: { status: 'REFUNDED', refundedMinor: amount, meta: { ...(payment.meta ?? {}), refundNote: opts.note } } });
  }
  await Order.updateOne(
    { _id: order._id, shopId: sid(shopId) },
    {
      $set: { paymentStatus: 'REFUNDED' },
      $push: { timeline: { status: order.status, at: new Date(), by: opts.by ? sid(opts.by) : null, byLabel: 'Payment', note: opts.note ?? `Refunded${opts.viaProvider ? ' via provider' : ' manually'}` } },
    },
  );
}
