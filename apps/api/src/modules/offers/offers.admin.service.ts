import { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { buildMeta } from '@/common/pagination';
import { Coupon } from '@/database/models/coupon.model';
import { Offer } from '@/database/models/offer.model';
import { Category } from '@/database/models/category.model';
import { Product } from '@/database/models/product.model';
import type { CreateCouponInput, CreateOfferInput, OfferListQuery, UpdateCouponInput, UpdateOfferInput } from './offers.schemas';

const sid = (shopId: string): Types.ObjectId => new Types.ObjectId(shopId);
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toDto = <T extends { _id: Types.ObjectId }>(d: T): Omit<T, '_id' | '__v'> & { id: string } => {
  const { _id, ...rest } = d as T & { __v?: number };
  delete (rest as { __v?: number }).__v;
  return { id: String(_id), ...(rest as Omit<T, '_id' | '__v'>) };
};

/** Keeps only ids that belong to this shop (prevents cross-tenant references). */
async function ownedProductIds(shopId: string, ids: string[]): Promise<Types.ObjectId[]> {
  if (!ids.length) return [];
  const found = await Product.find({ shopId: sid(shopId), _id: { $in: ids }, deletedAt: null }).select('_id').lean();
  return found.map((p) => p._id);
}
async function ownedCategoryIds(shopId: string, ids: string[]): Promise<Types.ObjectId[]> {
  if (!ids.length) return [];
  const found = await Category.find({ shopId: sid(shopId), _id: { $in: ids } }).select('_id').lean();
  return found.map((c) => c._id);
}

// ------------------------------------------------------------------ offers
export async function listOffers(shopId: string, q: OfferListQuery) {
  const filter: Record<string, unknown> = { shopId: sid(shopId) };
  if (q.active) filter.isActive = q.active === 'true';
  if (q.q) filter.name = new RegExp(escapeRegex(q.q), 'i');
  const [total, docs] = await Promise.all([
    Offer.countDocuments(filter),
    Offer.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
  ]);
  return { items: docs.map(toDto), meta: buildMeta(q.page, q.limit, total) };
}

export async function getOffer(shopId: string, id: string) {
  const doc = await Offer.findOne({ _id: id, shopId: sid(shopId) }).lean();
  if (!doc) throw Errors.notFound('NOT_FOUND', 'Offer not found');
  return toDto(doc);
}

export async function createOffer(shopId: string, input: CreateOfferInput) {
  const doc = await Offer.create({
    ...input,
    shopId: sid(shopId),
    productIds: input.scope === 'PRODUCTS' ? await ownedProductIds(shopId, input.productIds) : [],
    categoryIds: input.scope === 'CATEGORIES' ? await ownedCategoryIds(shopId, input.categoryIds) : [],
  });
  return toDto(doc.toObject());
}

export async function updateOffer(shopId: string, id: string, input: UpdateOfferInput) {
  const existing = await Offer.findOne({ _id: id, shopId: sid(shopId) });
  if (!existing) throw Errors.notFound('NOT_FOUND', 'Offer not found');
  const { productIds, categoryIds, ...rest } = input;
  existing.set(rest);
  if (productIds) existing.productIds = await ownedProductIds(shopId, productIds);
  if (categoryIds) existing.categoryIds = await ownedCategoryIds(shopId, categoryIds);
  if (existing.scope === 'PRODUCTS' && !existing.productIds.length) throw Errors.badRequest('VALIDATION_ERROR', 'Select at least one product');
  if (existing.scope === 'CATEGORIES' && !existing.categoryIds.length) throw Errors.badRequest('VALIDATION_ERROR', 'Select at least one category');
  if (existing.discountType === 'BUY_X_GET_Y' && (!existing.buyQty || !existing.getQty)) throw Errors.badRequest('VALIDATION_ERROR', 'buyQty and getQty are required for BUY_X_GET_Y');
  await existing.save();
  return toDto(existing.toObject());
}

export async function toggleOffer(shopId: string, id: string) {
  const doc = await Offer.findOneAndUpdate({ _id: id, shopId: sid(shopId) }, [{ $set: { isActive: { $not: ['$isActive'] } } }], { new: true }).lean();
  if (!doc) throw Errors.notFound('NOT_FOUND', 'Offer not found');
  return toDto(doc);
}

export async function deleteOffer(shopId: string, id: string): Promise<void> {
  const res = await Offer.deleteOne({ _id: id, shopId: sid(shopId) });
  if (!res.deletedCount) throw Errors.notFound('NOT_FOUND', 'Offer not found');
}

// ------------------------------------------------------------------ coupons
export async function listCoupons(shopId: string, q: OfferListQuery) {
  const filter: Record<string, unknown> = { shopId: sid(shopId) };
  if (q.active) filter.isActive = q.active === 'true';
  if (q.q) filter.code = new RegExp(escapeRegex(q.q.toUpperCase()), 'i');
  const [total, docs] = await Promise.all([
    Coupon.countDocuments(filter),
    Coupon.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
  ]);
  return { items: docs.map(toDto), meta: buildMeta(q.page, q.limit, total) };
}

export async function createCoupon(shopId: string, input: CreateCouponInput) {
  try {
    const doc = await Coupon.create({ ...input, shopId: sid(shopId) });
    return toDto(doc.toObject());
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw Errors.conflict('CONFLICT', 'A coupon with this code already exists');
    throw err;
  }
}

export async function updateCoupon(shopId: string, id: string, input: UpdateCouponInput) {
  const doc = await Coupon.findOneAndUpdate({ _id: id, shopId: sid(shopId) }, { $set: input }, { new: true, runValidators: true }).lean();
  if (!doc) throw Errors.notFound('NOT_FOUND', 'Coupon not found');
  return toDto(doc);
}

export async function toggleCoupon(shopId: string, id: string) {
  const doc = await Coupon.findOneAndUpdate({ _id: id, shopId: sid(shopId) }, [{ $set: { isActive: { $not: ['$isActive'] } } }], { new: true }).lean();
  if (!doc) throw Errors.notFound('NOT_FOUND', 'Coupon not found');
  return toDto(doc);
}

export async function deleteCoupon(shopId: string, id: string): Promise<void> {
  const res = await Coupon.deleteOne({ _id: id, shopId: sid(shopId) });
  if (!res.deletedCount) throw Errors.notFound('NOT_FOUND', 'Coupon not found');
}
