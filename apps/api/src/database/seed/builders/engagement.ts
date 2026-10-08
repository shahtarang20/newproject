import type { Types } from 'mongoose';
import type { IAuditLog } from '@/database/models/audit-log.model';
import type { IEnquiry } from '@/database/models/enquiry.model';
import type { INotification } from '@/database/models/notification.model';
import type { IOrder } from '@/database/models/order.model';
import { ENQUIRY_MESSAGES, ENQUIRY_REPLIES, FIRST_NAMES, LAST_NAMES } from '../data/customers';
import { DAY_MS, HOUR_MS, type Rng } from '../prng';
import type { BuiltProduct, ShopContext } from '../types';
import { newId } from '../util';
import type { CustomerPlan } from './customers';

export function planEnquiries(ctx: ShopContext, rng: Rng, now: Date, built: BuiltProduct[], customerPlan: CustomerPlan): IEnquiry[] {
  const sellable = built.filter((b) => b.product.status !== 'DRAFT');
  const out: IEnquiry[] = [];
  for (let i = 0; i < ctx.def.enquiryCount; i++) {
    const createdAt = new Date(now.getTime() - Math.floor(rng.next() ** 1.2 * 45 * DAY_MS) - 2 * HOUR_MS);
    const known = rng.chance(0.4) ? rng.pick(customerPlan.customers) : undefined;
    const name = known?.name ?? `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    const phone = known?.phone ?? `+9190${ctx.def.rngSeed % 10}${String(rng.int(0, 999_999)).padStart(6, '0')}`;
    const status = rng.weighted<IEnquiry['status']>([['NEW', 30], ['IN_PROGRESS', 25], ['RESPONDED', 25], ['CLOSED', 20]]);
    const answered = status === 'RESPONDED' || status === 'CLOSED';
    const respondedAt = answered ? new Date(Math.min(createdAt.getTime() + rng.int(1, 20) * HOUR_MS, now.getTime())) : null;
    const product = rng.chance(0.8) ? rng.pick(sellable).product : undefined;
    out.push({
      _id: newId(), shopId: ctx.shopId, productId: product?._id ?? null, customerId: known?._id ?? null, name, phone, email: known?.email,
      message: `${rng.pick(ENQUIRY_MESSAGES)}${product ? ` (${product.name})` : ''}`, status, source: rng.weighted<IEnquiry['source']>([['STOREFRONT', 60], ['WHATSAPP', 30], ['MANUAL', 10]]),
      assignedTo: status === 'NEW' ? null : ctx.ownerId, notes: answered || status === 'IN_PROGRESS' ? [{ by: ctx.ownerId, text: rng.pick(ENQUIRY_REPLIES), at: respondedAt ?? createdAt }] : [],
      respondedAt, createdAt, updatedAt: respondedAt ?? createdAt,
    });
  }
  return out.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function planNotifications(ctx: ShopContext, now: Date, built: BuiltProduct[], orders: IOrder[], enquiries: IEnquiry[]): INotification[] {
  const base = { shopId: ctx.shopId, userId: ctx.ownerId, channels: ['IN_APP' as const] };
  const list: INotification[] = [];
  const recent = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  recent.slice(0, 4).forEach((o, i) => list.push({
    ...base, _id: newId(), type: 'ORDER_NEW', title: `New order ${o.orderNumber}`, body: `${o.customerSnapshot.name} placed an order for Rs ${(o.totalMinor / 100).toFixed(2)}.`,
    data: { orderId: String(o._id), orderNumber: o.orderNumber }, readAt: i >= 2 ? o.createdAt : null, createdAt: o.createdAt,
  }));
  const paid = recent.find((o) => o.paymentStatus === 'PAID' && o.paymentMethod === 'ONLINE');
  if (paid) list.push({ ...base, _id: newId(), type: 'PAYMENT_RECEIVED', title: `Payment received for ${paid.orderNumber}`, body: `Rs ${(paid.totalMinor / 100).toFixed(2)} paid online.`, data: { orderId: String(paid._id) }, readAt: null, createdAt: paid.createdAt });
  enquiries.filter((e) => e.status === 'NEW').slice(-2).forEach((e) => list.push({
    ...base, _id: newId(), type: 'ENQUIRY_NEW', title: `New enquiry from ${e.name}`, body: e.message.slice(0, 120), data: { enquiryId: String(e._id) }, readAt: null, createdAt: e.createdAt,
  }));
  const low = built.filter((b) => b.spec.stock === 'low' && b.product.status !== 'DRAFT').slice(0, 2);
  low.forEach((b, i) => list.push({
    ...base, _id: newId(), type: 'LOW_STOCK', title: `Low stock: ${b.product.name}`, body: `Only ${b.product.stockTotal} units left across all variants.`,
    data: { productId: String(b.product._id) }, readAt: i === 1 ? now : null, createdAt: new Date(now.getTime() - (i + 1) * DAY_MS),
  }));
  const out = built.find((b) => b.product.status === 'OUT_OF_STOCK');
  if (out) list.push({ ...base, _id: newId(), type: 'OUT_OF_STOCK', title: `Out of stock: ${out.product.name}`, body: 'All variants are sold out.', data: { productId: String(out.product._id) }, readAt: null, createdAt: new Date(now.getTime() - 2 * DAY_MS) });
  return list;
}

export function planAudit(ctx: ShopContext, now: Date, built: BuiltProduct[], orders: IOrder[], catalogueIds: Array<{ id: Types.ObjectId; name: string; at: Date }>, adminId: Types.ObjectId, proPlanCode: string): IAuditLog[] {
  const base = { shopId: ctx.shopId, userId: ctx.ownerId, ip: '127.0.0.1' };
  const logs: IAuditLog[] = [
    { _id: newId(), shopId: ctx.shopId, userId: adminId, action: 'subscription.assign', entity: 'Subscription', after: { plan: proPlanCode }, ip: '127.0.0.1', createdAt: new Date(now.getTime() - 95 * DAY_MS) },
    { ...base, _id: newId(), action: 'shop.update', entity: 'Shop', entityId: String(ctx.shopId), before: { templateId: 'minimal-noir' }, after: { templateId: ctx.def.templateId }, createdAt: new Date(now.getTime() - 88 * DAY_MS) },
  ];
  built.slice(0, 4).forEach((b) => logs.push({ ...base, _id: newId(), action: 'product.create', entity: 'Product', entityId: String(b.product._id), after: { name: b.product.name, sku: b.product.sku }, createdAt: b.product.createdAt }));
  catalogueIds.forEach((c) => logs.push({ ...base, _id: newId(), action: 'catalogue.create', entity: 'Catalogue', entityId: String(c.id), after: { name: c.name }, createdAt: c.at }));
  logs.push({ ...base, _id: newId(), action: 'offer.create', entity: 'Offer', after: { name: 'Festive Season 10% Off', discount: '10%' }, createdAt: new Date(now.getTime() - 45 * DAY_MS) });
  [...orders].filter((o) => o.timeline.length > 1).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4).forEach((o) => {
    const prev = o.timeline[o.timeline.length - 2];
    const cur = o.timeline[o.timeline.length - 1];
    logs.push({ ...base, _id: newId(), action: 'order.status', entity: 'Order', entityId: String(o._id), before: { status: prev.status }, after: { status: cur.status }, meta: { orderNumber: o.orderNumber }, createdAt: cur.at });
  });
  logs.push({ ...base, _id: newId(), action: 'auth.login', entity: 'User', entityId: String(ctx.ownerId), createdAt: new Date(now.getTime() - 2 * HOUR_MS) });
  return logs;
}
