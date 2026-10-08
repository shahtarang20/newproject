import { Types, type PipelineStage } from 'mongoose';
import { Errors } from '@/common/errors';
import { buildMeta } from '@/common/pagination';
import { audit, type AuditActor } from '@/common/audit';
import { normalisePhone } from '@/common/utils/phone';
import { Customer, type ICustomer } from '@/database/models/customer.model';
import { CustomerAddress } from '@/database/models/customer-address.model';
import { Order } from '@/database/models/order.model';
import { Enquiry } from '@/database/models/enquiry.model';
import { assertWithinLimit, incrementUsage } from '@/modules/subscriptions/limits.service';
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customers.schemas';

const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const iso = (d?: Date | null): string | undefined => (d ? new Date(d).toISOString() : undefined);
const DEAD_STATUSES = ['CANCELLED', 'REJECTED'];

type CustomerDoc = ICustomer & { _id: Types.ObjectId };

export interface CustomerDTO {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  notes?: string;
  source: ICustomer['source'];
  isBlocked: boolean;
  hasAccount: boolean;
  stats: { ordersCount: number; totalSpentMinor: number; lastOrderAt?: string };
  createdAt: string;
  updatedAt: string;
}

export function toCustomerDTO(c: CustomerDoc): CustomerDTO {
  return {
    id: String(c._id),
    name: c.name,
    phone: c.phone,
    email: c.email || undefined,
    tags: c.tags ?? [],
    notes: c.notes || undefined,
    source: c.source,
    isBlocked: Boolean(c.isBlocked),
    hasAccount: Boolean(c.userId),
    stats: { ordersCount: c.stats?.ordersCount ?? 0, totalSpentMinor: c.stats?.totalSpentMinor ?? 0, lastOrderAt: iso(c.stats?.lastOrderAt) },
    createdAt: iso(c.createdAt) as string,
    updatedAt: iso(c.updatedAt) as string,
  };
}

function buildFilter(shopId: string, q: Pick<ListCustomersQuery, 'q' | 'tag'>): Record<string, unknown> {
  const filter: Record<string, unknown> = { shopId: oid(shopId) };
  if (q.tag) filter.tags = q.tag;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const ors: Record<string, unknown>[] = [{ name: rx }, { email: rx }, { phone: rx }];
    const digits = q.q.replace(/\D/g, '');
    if (digits.length >= 3) ors.push({ phone: new RegExp(escapeRegex(digits)) });
    filter.$or = ors;
  }
  return filter;
}

function buildSort(q: Pick<ListCustomersQuery, 'sort' | 'dir'>): Record<string, 1 | -1> {
  const dir = (d: 1 | -1): 1 | -1 => (q.dir ? (q.dir === 'asc' ? 1 : -1) : d);
  switch (q.sort) {
    case 'totalSpent':
      return { 'stats.totalSpentMinor': dir(-1), _id: 1 };
    case 'lastOrderAt':
      return { 'stats.lastOrderAt': dir(-1), _id: 1 };
    case 'name':
      return { name: dir(1), _id: 1 };
    default:
      return { createdAt: dir(-1), _id: -1 };
  }
}

export async function listCustomers(shopId: string, q: ListCustomersQuery) {
  const filter = buildFilter(shopId, q);
  const [total, rows] = await Promise.all([
    Customer.countDocuments(filter),
    Customer.find(filter)
      .sort(buildSort(q))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<CustomerDoc[]>(),
  ]);
  return { data: rows.map(toCustomerDTO), meta: buildMeta(q.page, q.limit, total) };
}

export async function getCustomerDetail(shopId: string, id: string) {
  const customer = await Customer.findOne({ _id: oid(id), shopId: oid(shopId) }).lean<CustomerDoc | null>();
  if (!customer) throw Errors.notFound('NOT_FOUND', 'Customer not found');

  const orderMatch = { shopId: oid(shopId), $or: [{ customerId: customer._id }, { 'customerSnapshot.phone': customer.phone }] };
  const liveMatch = { ...orderMatch, status: { $nin: DEAD_STATUSES } };

  const productsPipeline: PipelineStage[] = [
    { $match: liveMatch },
    { $sort: { createdAt: -1 } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        imageUrl: { $first: '$items.imageUrl' },
        quantity: { $sum: '$items.qty' },
        spentMinor: { $sum: '$items.lineTotalMinor' },
        orders: { $addToSet: '$_id' },
        lastPurchasedAt: { $max: '$createdAt' },
      },
    },
    { $addFields: { ordersCount: { $size: '$orders' } } },
    { $sort: { quantity: -1, lastPurchasedAt: -1 } },
    { $limit: 20 },
    { $project: { orders: 0 } },
  ];

  const [statusRows, recent, enquiries, savedAddresses, products] = await Promise.all([
    Order.aggregate<{ _id: string; n: number; total: number; last: Date }>([
      { $match: orderMatch },
      { $group: { _id: '$status', n: { $sum: 1 }, total: { $sum: '$totalMinor' }, last: { $max: '$createdAt' } } },
    ]),
    Order.find(orderMatch)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber status paymentStatus paymentMethod totalMinor currency items.qty address createdAt')
      .lean(),
    Enquiry.find({ shopId: oid(shopId), $or: [{ customerId: customer._id }, { phone: customer.phone }] })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('message status productId respondedAt createdAt')
      .lean(),
    CustomerAddress.find({ shopId: oid(shopId), customerId: customer._id }).sort({ isDefault: -1, createdAt: -1 }).limit(10).lean(),
    Order.aggregate<{
      _id: Types.ObjectId; name: string; imageUrl?: string; quantity: number; spentMinor: number; ordersCount: number; lastPurchasedAt: Date;
    }>(productsPipeline),
  ]);

  const live = statusRows.filter((r) => !DEAD_STATUSES.includes(r._id));
  const ordersCount = live.reduce((n, r) => n + r.n, 0);
  const totalSpentMinor = live.reduce((n, r) => n + r.total, 0);
  const lastOrderAt = live.reduce<Date | undefined>((m, r) => (!m || r.last > m ? r.last : m), undefined);
  const cancelledCount = statusRows.filter((r) => DEAD_STATUSES.includes(r._id)).reduce((n, r) => n + r.n, 0);

  const purchasedProducts = products.map((p) => ({
    productId: String(p._id),
    name: p.name,
    imageUrl: p.imageUrl,
    quantity: p.quantity,
    spentMinor: p.spentMinor,
    ordersCount: p.ordersCount,
    lastPurchasedAt: iso(p.lastPurchasedAt),
  }));

  // Saved addresses + distinct addresses seen on past orders (guest checkouts don't create saved ones).
  const addresses: Array<Record<string, unknown>> = savedAddresses.map((a) => ({
    id: String(a._id), label: a.label, isDefault: a.isDefault, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2,
    landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, country: a.country, source: 'SAVED',
  }));
  const seen = new Set(addresses.map((a) => `${String(a.line1).toLowerCase()}|${a.pincode}`));
  for (const o of recent) {
    const a = o.address;
    if (!a) continue;
    const key = `${a.line1.toLowerCase()}|${a.pincode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push({ isDefault: false, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, country: a.country, source: 'ORDER' });
  }

  return {
    customer: toCustomerDTO(customer),
    orderStats: {
      ordersCount,
      cancelledCount,
      totalSpentMinor,
      averageOrderMinor: ordersCount ? Math.round(totalSpentMinor / ordersCount) : 0,
      lastOrderAt: iso(lastOrderAt),
    },
    recentOrders: recent.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      totalMinor: o.totalMinor,
      currency: o.currency,
      itemCount: o.items.reduce((n, i) => n + i.qty, 0),
      createdAt: iso(o.createdAt),
    })),
    enquiries: enquiries.map((e) => ({
      id: String(e._id),
      message: e.message,
      status: e.status,
      productId: e.productId ? String(e.productId) : undefined,
      respondedAt: iso(e.respondedAt),
      createdAt: iso(e.createdAt),
    })),
    purchasedProducts,
    favouriteProducts: purchasedProducts.filter((p) => p.quantity >= 2 || p.ordersCount >= 2).slice(0, 5),
    addresses,
  };
}

export async function createCustomer(shopId: string, input: CreateCustomerInput, actor: AuditActor): Promise<CustomerDTO> {
  const phone = normalisePhone(input.phone);
  const exists = await Customer.exists({ shopId: oid(shopId), phone });
  if (exists) throw Errors.conflict('CONFLICT', 'A customer with this phone number already exists');
  await assertWithinLimit(shopId, 'customers');
  let doc: CustomerDoc;
  try {
    const created = await Customer.create({
      shopId: oid(shopId),
      name: input.name,
      phone,
      email: input.email,
      notes: input.notes,
      tags: input.tags ?? [],
      source: 'MANUAL',
    });
    doc = created.toObject() as CustomerDoc;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw Errors.conflict('CONFLICT', 'A customer with this phone number already exists');
    throw err;
  }
  await incrementUsage(shopId, 'customers');
  void audit(actor, { action: 'customer.create', entity: 'Customer', entityId: doc._id, after: { name: doc.name, phone } });
  return toCustomerDTO(doc);
}

export async function updateCustomer(shopId: string, id: string, input: UpdateCustomerInput, actor: AuditActor): Promise<CustomerDTO> {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  if (input.name !== undefined) $set.name = input.name;
  if (input.tags !== undefined) $set.tags = input.tags;
  if (input.isBlocked !== undefined) $set.isBlocked = input.isBlocked;
  if (input.email !== undefined) (input.email ? ($set.email = input.email) : ($unset.email = 1));
  if (input.notes !== undefined) (input.notes ? ($set.notes = input.notes) : ($unset.notes = 1));
  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;

  const doc = await Customer.findOneAndUpdate({ _id: oid(id), shopId: oid(shopId) }, update, { new: true }).lean<CustomerDoc | null>();
  if (!doc) throw Errors.notFound('NOT_FOUND', 'Customer not found');
  void audit(actor, { action: 'customer.update', entity: 'Customer', entityId: id, after: { fields: Object.keys(input) } });
  return toCustomerDTO(doc);
}

// ------------------------------------------------------------------ CSV export
const MAX_EXPORT = 50_000;
/** CSV-escapes a cell and neutralises spreadsheet formula injection. */
const cell = (v: unknown): string => {
  let s = v === undefined || v === null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function* exportCustomersCsv(shopId: string, q: Pick<ListCustomersQuery, 'q' | 'tag' | 'sort' | 'dir'>): AsyncGenerator<string> {
  yield '﻿Name,Phone,Email,Source,Tags,Orders,Total spent,Last order,Blocked,Notes,Created\n';
  const cursor = Customer.find(buildFilter(shopId, q)).sort(buildSort(q)).limit(MAX_EXPORT).lean<CustomerDoc[]>().cursor();
  for await (const c of cursor) {
    yield (
      [
        c.name, c.phone, c.email, c.source, (c.tags ?? []).join('; '), c.stats?.ordersCount ?? 0,
        ((c.stats?.totalSpentMinor ?? 0) / 100).toFixed(2), iso(c.stats?.lastOrderAt), c.isBlocked ? 'yes' : 'no', c.notes, iso(c.createdAt),
      ]
        .map(cell)
        .join(',') + '\n'
    );
  }
}
