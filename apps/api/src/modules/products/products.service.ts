import type { FilterQuery, Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { audit, type AuditActor } from '@/common/audit';
import { buildMeta, parsePagination } from '@/common/pagination';
import { uniqueSlug } from '@/common/slug';
import { invalidateShopCache } from '@/common/utils/cache';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/config/constants';
import { Category } from '@/database/models/category.model';
import { InventoryTransaction } from '@/database/models/inventory-transaction.model';
import { Media } from '@/database/models/media.model';
import { Product, type IProduct } from '@/database/models/product.model';
import { ProductVariant } from '@/database/models/product-variant.model';
import { assertWithinLimit, incrementUsage } from '../subscriptions/limits.service';
import { subtreeIds } from '../categories/categories.service';
import { assertSkuFree, generateSku, normaliseSku, skuConflict } from './product.keys';
import { recomputeProductSummary } from './product.summary';
import { escapeRegex, oid, retryOnDuplicate, withId, type Id } from './product.utils';
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from './products.schemas';
import { createVariants } from './variants.service';

export { recomputeProductSummary } from './product.summary';

const notFound = () => Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');

const LIST_PROJECTION = '-description -sareeAttrs -garmentAttrs -seo -media -mediaIds -occasions';
const SORT_MAP: Record<string, string> = { price: 'pricing.minSellingMinor' };

export async function resolveCategory(shopId: Types.ObjectId, categoryId?: string | null, subcategoryId?: string | null): Promise<Types.ObjectId | null | undefined> {
  if (subcategoryId) {
    const sub = await Category.findOne({ _id: oid(subcategoryId), shopId }).select('parentId').lean();
    if (!sub) throw Errors.badRequest('CATEGORY_NOT_FOUND', 'Sub-category not found');
    if (categoryId && String(sub.parentId ?? '') !== categoryId) throw Errors.badRequest('VALIDATION_ERROR', 'Sub-category does not belong to the selected category');
    return sub._id;
  }
  if (categoryId === undefined) return undefined;
  if (categoryId === null) return null;
  if (!(await Category.exists({ _id: oid(categoryId), shopId }))) throw Errors.badRequest('CATEGORY_NOT_FOUND', 'Category not found');
  return oid(categoryId);
}

export async function listProducts(shopId: Types.ObjectId, q: ListProductsQuery) {
  const { page, limit, skip, sort } = parsePagination(q as Record<string, unknown>, { defaultLimit: 20, maxLimit: 100 });
  const sortSpec = Object.fromEntries(Object.entries(sort).map(([k, v]) => [SORT_MAP[k] ?? k, v]));

  const filter: FilterQuery<IProduct> = { shopId, deletedAt: null };
  if (q.status) filter.status = q.status;
  if (q.type) filter.type = q.type;
  if (q.isFeatured !== undefined) filter.isFeatured = q.isFeatured;
  if (q.category) filter.categoryId = { $in: await subtreeIds(shopId, oid(q.category)) };
  const and: FilterQuery<IProduct>[] = [];
  if (q.outOfStock) and.push({ $or: [{ stockTotal: { $lte: 0 } }, { status: 'OUT_OF_STOCK' }] });
  if (q.lowStock) and.push({ stockTotal: { $gt: 0 } }, { $expr: { $lte: ['$stockTotal', { $ifNull: ['$lowStockThreshold', DEFAULT_LOW_STOCK_THRESHOLD] }] } });
  if (q.q) {
    // Regex (not $text) so partial words match ("kanj" → Kanjivaram); always scoped by shopId so the shop indexes still prune.
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    and.push({ $or: [{ name: rx }, { sku: rx }, { brand: rx }, { tags: rx }] });
  }
  if (and.length) filter.$and = and;

  const [items, total] = await Promise.all([
    Product.find(filter).select(LIST_PROJECTION).sort(sortSpec).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  // One batched lookup so list rows can show a category name without an N+1.
  const catIds = [...new Set(items.map((p) => (p.categoryId ? String(p.categoryId) : '')).filter(Boolean))];
  const cats = catIds.length ? await Category.find({ shopId, _id: { $in: catIds.map(oid) } }).select('name slug').lean() : [];
  const catById = new Map(cats.map((c) => [String(c._id), { id: String(c._id), name: c.name, slug: c.slug }]));
  return {
    items: items.map((p) => ({ ...withId(p), category: p.categoryId ? (catById.get(String(p.categoryId)) ?? null) : null })),
    meta: buildMeta(page, limit, total),
  };
}

export async function getProduct(shopId: Types.ObjectId, id: Id) {
  const pid = oid(id);
  const product = await Product.findOne({ _id: pid, shopId, deletedAt: null }).lean();
  if (!product) throw notFound();
  const [variants, media, category] = await Promise.all([
    ProductVariant.find({ shopId, productId: pid }).sort({ createdAt: 1 }).lean(),
    Media.find({ shopId, productId: pid }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    product.categoryId ? Category.findOne({ _id: product.categoryId, shopId }).select('name slug parentId').lean() : null,
  ]);
  return {
    ...withId(product),
    media: media.map((m) => withId(m)),
    variants: variants.map((v) => withId(v)),
    category: category ? withId(category) : null,
  };
}

const cleanTags = (tags: string[]): string[] => [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];

export async function createProduct(shopId: Types.ObjectId, input: CreateProductInput, actor: AuditActor) {
  await assertWithinLimit(shopId, 'products', 1);
  const categoryId = await resolveCategory(shopId, input.categoryId, input.subcategoryId);
  const explicitSku = input.sku ? normaliseSku(input.sku) : undefined;
  if (explicitSku) await assertSkuFree(shopId, explicitSku);

  let sku = explicitSku;
  const doc = await retryOnDuplicate(async () => {
    const slug = await uniqueSlug(Product, input.slug || input.name, { shopId });
    sku = explicitSku ?? generateSku(input.name);
    return Product.create({
      shopId,
      type: input.type,
      name: input.name,
      slug,
      sku,
      brand: input.brand,
      description: input.description,
      shortDescription: input.shortDescription,
      categoryId: categoryId ?? null,
      tags: cleanTags(input.tags ?? []),
      gender: input.gender,
      occasions: input.occasions ?? [],
      fabric: input.fabric,
      season: input.season,
      sareeAttrs: input.sareeAttrs,
      garmentAttrs: input.garmentAttrs,
      pricing: { taxPercent: input.pricing?.taxPercent ?? 0, hidePrice: input.pricing?.hidePrice ?? false },
      seo: input.seo,
      status: 'DRAFT',
      isFeatured: input.isFeatured ?? false,
      lowStockThreshold: input.lowStockThreshold,
    });
  }).catch((err: unknown) => {
    throw skuConflict(err, sku ?? '');
  });

  // Not transactional (standalone Mongo): on any variant failure the product and its partial variants are rolled back.
  try {
    if (input.variants?.length) await createVariants(shopId, doc, input.variants, actor.userId);
  } catch (err) {
    await Promise.all([
      ProductVariant.deleteMany({ shopId, productId: doc._id }),
      InventoryTransaction.deleteMany({ shopId, productId: doc._id }),
      Product.deleteOne({ _id: doc._id, shopId }),
    ]);
    throw err;
  }
  await incrementUsage(shopId, 'products', 1);
  if (input.variants?.length) await recomputeProductSummary(doc._id, shopId);
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'product.create', entity: 'Product', entityId: doc._id, after: { name: doc.name, sku: doc.sku, type: doc.type, variants: input.variants?.length ?? 0 } });
  return getProduct(shopId, doc._id);
}

const NESTED = ['sareeAttrs', 'garmentAttrs', 'pricing', 'seo'] as const;
const SCALARS = ['type', 'name', 'brand', 'description', 'shortDescription', 'gender', 'fabric', 'season', 'isFeatured', 'lowStockThreshold', 'occasions'] as const;

/** Autosave-friendly: only supplied keys change; nested objects merge field-by-field; "" / null clears a value. */
export async function updateProduct(shopId: Types.ObjectId, id: Id, input: UpdateProductInput, actor: AuditActor) {
  const pid = oid(id);
  const before = await Product.findOne({ _id: pid, shopId, deletedAt: null }).lean();
  if (!before) throw notFound();

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  const put = (path: string, v: unknown) => (v === null || v === '' ? ($unset[path] = 1) : ($set[path] = v));

  for (const k of SCALARS) if (input[k] !== undefined) put(k, input[k]);
  if (input.tags !== undefined) $set.tags = cleanTags(input.tags);
  for (const group of NESTED) {
    const obj = input[group] as Record<string, unknown> | undefined;
    if (obj) for (const [k, v] of Object.entries(obj)) if (v !== undefined) put(`${group}.${k}`, v);
  }
  if (input.categoryId !== undefined || input.subcategoryId !== undefined) {
    const cat = await resolveCategory(shopId, input.categoryId, input.subcategoryId);
    if (cat !== undefined) $set.categoryId = cat;
  }
  let sku: string | undefined;
  if (input.sku !== undefined) {
    sku = normaliseSku(input.sku);
    await assertSkuFree(shopId, sku, pid);
    $set.sku = sku;
  }

  await retryOnDuplicate(async () => {
    if (input.slug !== undefined) $set.slug = await uniqueSlug(Product, input.slug, { shopId }, 'slug', { excludeId: pid });
    const update = { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
    if (Object.keys(update).length) await Product.updateOne({ _id: pid, shopId, deletedAt: null }, update);
  }).catch((err: unknown) => {
    throw skuConflict(err, sku ?? '');
  });

  invalidateShopCache(String(shopId));
  const changed = Object.keys(input);
  const snapshot = before as unknown as Record<string, unknown>;
  void audit(actor, { action: 'product.update', entity: 'Product', entityId: pid, before: Object.fromEntries(changed.map((k) => [k, snapshot[k]])), after: input });
  if (input.pricing?.taxPercent !== undefined && input.pricing.taxPercent !== before.pricing.taxPercent) {
    void audit(actor, { action: 'product.price_change', entity: 'Product', entityId: pid, before: { taxPercent: before.pricing.taxPercent }, after: { taxPercent: input.pricing.taxPercent } });
  }
  return getProduct(shopId, pid);
}

export async function setProductStatus(shopId: Types.ObjectId, id: Id, status: IProduct['status'], actor: AuditActor) {
  const pid = oid(id);
  const product = await Product.findOne({ _id: pid, shopId, deletedAt: null }).select('status').lean();
  if (!product) throw notFound();

  if (status === 'ACTIVE') {
    const [variants, images] = await Promise.all([
      ProductVariant.countDocuments({ shopId, productId: pid, isActive: true }),
      Media.countDocuments({ shopId, productId: pid, kind: 'IMAGE' }),
    ]);
    const missing: string[] = [];
    if (!variants) missing.push('at least one active variant (colour/size with a price)');
    if (!images) missing.push('at least one image');
    if (missing.length) {
      throw Errors.badRequest('VALIDATION_ERROR', `Cannot publish yet. Add ${missing.join(' and ')} first.`, { missing: { variants: !variants, images: !images } });
    }
  }
  await Product.updateOne({ _id: pid, shopId }, { $set: { status } });
  await recomputeProductSummary(pid, shopId); // may flip ACTIVE → OUT_OF_STOCK when there is no stock
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'product.status', entity: 'Product', entityId: pid, before: { status: product.status }, after: { status } });
  return getProduct(shopId, pid);
}
