import { Types } from 'mongoose';
import { Errors, isAppError } from '@/common/errors';
import { buildMeta } from '@/common/pagination';
import { audit, type AuditActor } from '@/common/audit';
import { normalisePhone } from '@/common/utils/phone';
import { logger } from '@/config/logger';
import { Enquiry, type IEnquiry } from '@/database/models/enquiry.model';
import { Product } from '@/database/models/product.model';
import { ProductVariant } from '@/database/models/product-variant.model';
import { Customer } from '@/database/models/customer.model';
import { Shop } from '@/database/models/shop.model';
import { notify } from '@/providers/notifications/notify.service';
import { assertWithinLimit, incrementUsage } from '@/modules/subscriptions/limits.service';
import { recordEvent } from '@/modules/analytics/analytics.service';
import type { CreateEnquiryInput, ListEnquiriesQuery, UpdateEnquiryInput } from './enquiries.schemas';

const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ------------------------------------------------------------------ public creation
/**
 * Creates an enquiry from the storefront. Validates product/variant ownership, upserts a lead Customer by phone
 * (NOT counted toward orders; skipped silently when the plan's customer limit is reached), notifies the shop.
 */
export async function createEnquiry(shopId: string, input: CreateEnquiryInput): Promise<{ id: string }> {
  const phone = normalisePhone(input.phone);
  let message = input.question;
  let productId: Types.ObjectId | null = null;
  let productName: string | undefined;

  if (input.productId) {
    const product = await Product.findOne({ _id: oid(input.productId), shopId: oid(shopId), status: 'ACTIVE', deletedAt: null }).select('name').lean();
    if (!product) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    productId = product._id;
    productName = product.name;
    if (input.variantId) {
      const v = await ProductVariant.findOne({ _id: oid(input.variantId), shopId: oid(shopId), productId: product._id, isActive: true })
        .select('colour size sku')
        .lean();
      if (!v) throw Errors.badRequest('INVALID_VARIANT', 'Selected variant is not available');
      const label = [v.colour?.name, v.size].filter(Boolean).join(' / ');
      // Enquiry has no variant field; keep the context in the message text.
      message = `${input.question.slice(0, 1700)}\n\n[Variant: ${label || v.sku || input.variantId}]`;
    }
  } else if (input.variantId) {
    throw Errors.badRequest('INVALID_VARIANT', 'variantId requires productId');
  }

  const customerId = await upsertLead(shopId, input.customerName, phone, input.email);

  const enquiry = await Enquiry.create({
    shopId: oid(shopId),
    productId,
    customerId,
    name: input.customerName,
    phone,
    email: input.email,
    message,
    status: 'NEW',
    source: 'STOREFRONT',
  });

  void notify({
    shopId,
    type: 'ENQUIRY_NEW',
    title: productName ? `New enquiry: ${productName}` : 'New enquiry',
    body: `${input.customerName} (${phone}): ${input.question.slice(0, 200)}`,
    data: { enquiryId: String(enquiry._id), productId: productId ? String(productId) : undefined },
    channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
  });
  recordEvent(shopId, { type: 'ENQUIRY', productId: productId ? String(productId) : undefined }).catch((err) =>
    logger.warn({ err }, 'enquiry analytics event failed'),
  );

  return { id: String(enquiry._id) };
}

async function upsertLead(shopId: string, name: string, phone: string, email?: string): Promise<Types.ObjectId | null> {
  try {
    const existing = await Customer.findOne({ shopId: oid(shopId), phone }).select('_id').lean();
    if (existing) return existing._id;
    try {
      await assertWithinLimit(shopId, 'customers');
    } catch (err) {
      if (isAppError(err) && err.code === 'CUSTOMER_LIMIT_REACHED') return null; // still store the enquiry
      throw err;
    }
    const res = await Customer.findOneAndUpdate(
      { shopId: oid(shopId), phone },
      { $setOnInsert: { shopId: oid(shopId), name, phone, ...(email ? { email } : {}), source: 'ENQUIRY', tags: [], isBlocked: false } },
      { upsert: true, new: true, includeResultMetadata: true },
    );
    if (res.lastErrorObject && res.lastErrorObject.updatedExisting === false) await incrementUsage(shopId, 'customers');
    return res.value?._id ?? null;
  } catch (err) {
    logger.warn({ err }, 'enquiry lead upsert failed');
    return null; // never lose the enquiry because of the CRM side-effect
  }
}

// ------------------------------------------------------------------ dashboard
export interface EnquiryDTO {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  status: IEnquiry['status'];
  source: IEnquiry['source'];
  customerId?: string;
  product?: { id: string; name: string; slug: string; imageUrl?: string };
  response?: string;
  notes: { text: string; at: string }[];
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type ProductSnap = { id: string; name: string; slug: string; imageUrl?: string };

function toDTO(e: IEnquiry & { _id: Types.ObjectId }, products: Map<string, ProductSnap>): EnquiryDTO {
  const notes = (e.notes ?? []).map((n) => ({ text: n.text, at: new Date(n.at).toISOString() }));
  return {
    id: String(e._id),
    name: e.name,
    phone: e.phone,
    email: e.email || undefined,
    message: e.message,
    status: e.status,
    source: e.source,
    customerId: e.customerId ? String(e.customerId) : undefined,
    product: e.productId ? products.get(String(e.productId)) : undefined,
    response: notes.length ? notes[notes.length - 1].text : undefined,
    notes,
    respondedAt: e.respondedAt ? new Date(e.respondedAt).toISOString() : undefined,
    createdAt: new Date(e.createdAt).toISOString(),
    updatedAt: new Date(e.updatedAt).toISOString(),
  };
}

async function productSnapshots(shopId: string, ids: Types.ObjectId[]): Promise<Map<string, ProductSnap>> {
  if (!ids.length) return new Map();
  const rows = await Product.find({ shopId: oid(shopId), _id: { $in: ids } }).select('name slug primaryThumbUrl primaryImageUrl').lean();
  return new Map(rows.map((p) => [String(p._id), { id: String(p._id), name: p.name, slug: p.slug, imageUrl: p.primaryThumbUrl ?? p.primaryImageUrl }]));
}

export async function listEnquiries(shopId: string, q: ListEnquiriesQuery) {
  const filter: Record<string, unknown> = { shopId: oid(shopId) };
  if (q.status && q.status !== 'ALL') filter.status = q.status;
  if (q.productId) filter.productId = oid(q.productId);
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { message: rx }];
  }
  const [total, rows] = await Promise.all([
    Enquiry.countDocuments(filter),
    Enquiry.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<Array<IEnquiry & { _id: Types.ObjectId }>>(),
  ]);
  const snaps = await productSnapshots(shopId, rows.map((r) => r.productId).filter((x): x is Types.ObjectId => Boolean(x)));
  return { data: rows.map((r) => toDTO(r, snaps)), meta: buildMeta(q.page, q.limit, total) };
}

export async function getEnquiry(shopId: string, id: string): Promise<EnquiryDTO> {
  const e = await Enquiry.findOne({ _id: oid(id), shopId: oid(shopId) }).lean<(IEnquiry & { _id: Types.ObjectId }) | null>();
  if (!e) throw Errors.notFound('NOT_FOUND', 'Enquiry not found');
  const snaps = await productSnapshots(shopId, e.productId ? [e.productId] : []);
  return toDTO(e, snaps);
}

export async function getEnquiryStats(shopId: string) {
  const rows = await Enquiry.aggregate<{ _id: IEnquiry['status']; n: number }>([
    { $match: { shopId: oid(shopId) } },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const by = (s: string) => rows.find((r) => r._id === s)?.n ?? 0;
  const counts = { NEW: by('NEW'), IN_PROGRESS: by('IN_PROGRESS'), RESPONDED: by('RESPONDED'), CLOSED: by('CLOSED') };
  return { counts, total: rows.reduce((n, r) => n + r.n, 0), unreadNew: counts.NEW };
}

export async function updateEnquiry(shopId: string, id: string, input: UpdateEnquiryInput, actor: AuditActor): Promise<EnquiryDTO> {
  const existing = await Enquiry.findOne({ _id: oid(id), shopId: oid(shopId) });
  if (!existing) throw Errors.notFound('NOT_FOUND', 'Enquiry not found');
  const before = { status: existing.status };

  if (input.response) {
    existing.notes.push({ text: input.response, at: new Date(), by: actor.userId ? oid(actor.userId) : undefined });
    existing.respondedAt = new Date();
    existing.status = input.status ?? 'RESPONDED';
  } else if (input.status) {
    existing.status = input.status;
  }
  await existing.save();

  if (input.response) {
    const shop = await Shop.findById(shopId).select('name').lean();
    void notify({
      shopId,
      type: 'ENQUIRY_NEW', // TODO(notifications): no dedicated ENQUIRY_RESPONSE type in shared NOTIFICATION_TYPES
      title: `Reply from ${shop?.name ?? 'the shop'}`,
      body: input.response,
      data: { enquiryId: id },
      channels: ['WHATSAPP', 'EMAIL'],
      recipient: { phone: existing.phone, email: existing.email || undefined },
    });
  }
  void audit(actor, { action: 'enquiry.update', entity: 'Enquiry', entityId: id, before, after: { status: existing.status, responded: Boolean(input.response) } });
  return getEnquiry(shopId, id);
}
