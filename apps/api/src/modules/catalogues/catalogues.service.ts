import { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { buildMeta } from '@/common/pagination';
import { slugify, uniqueSlug } from '@/common/slug';
import { invalidateShopCache } from '@/common/utils/cache';
import { env } from '@/config/env';
import { Catalogue, Product, type ICatalogue } from '@/database/models';
import { assertWithinLimit, decrementUsage, incrementUsage } from '@/modules/subscriptions/limits.service';
import type { CreateBody, ListQuery, UpdateBody } from './catalogues.schemas';

const nf = (): never => {
  throw Errors.notFound('CATALOGUE_NOT_FOUND', 'Catalogue not found');
};

export const toDto = (c: ICatalogue) => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
  description: c.description ?? null,
  coverUrl: c.coverUrl ?? null,
  isPublic: c.isPublic,
  isActive: c.isActive,
  isPublished: c.isPublic && c.isActive,
  sortOrder: c.sortOrder,
  categoryIds: (c.categoryIds ?? []).map(String),
  startDate: c.startDate ?? null,
  endDate: c.endDate ?? null,
  layout: c.layout ?? null,
  productIds: [...(c.products ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => String(p.productId)),
  productCount: c.products?.length ?? 0,
  viewCount: c.viewCount,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

/** Validates the ids are live products of this shop; returns them de-duplicated, order preserved. */
async function validateProducts(shopId: Types.ObjectId, ids: string[]): Promise<Types.ObjectId[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const found = await Product.find({ shopId, deletedAt: null, _id: { $in: unique } }).select('_id').lean();
  if (found.length !== unique.length) {
    const ok = new Set(found.map((f) => String(f._id)));
    throw Errors.badRequest('VALIDATION_ERROR', 'Some products do not exist in your shop', { invalidProductIds: unique.filter((i) => !ok.has(i)) });
  }
  return unique.map((i) => new Types.ObjectId(i));
}

const toEmbedded = (ids: Types.ObjectId[]) => ids.map((productId, i) => ({ productId, sortOrder: i }));

async function load(shopId: Types.ObjectId, id: string) {
  const doc = await Catalogue.findOne({ _id: id, shopId });
  return doc ?? nf();
}

export async function list(shopId: Types.ObjectId, q: ListQuery) {
  const filter: Record<string, unknown> = { shopId };
  if (q.search) filter.name = { $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (q.published === 'true') Object.assign(filter, { isPublic: true, isActive: true });
  if (q.published === 'false') filter.$or = [{ isPublic: false }, { isActive: false }];
  const sort: Record<string, 1 | -1> = q.sort.startsWith('-') ? { [q.sort.slice(1)]: -1 } : { [q.sort]: 1 };
  const [rows, total] = await Promise.all([
    Catalogue.find(filter)
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Catalogue.countDocuments(filter),
  ]);
  return { items: rows.map(toDto), meta: buildMeta(q.page, q.limit, total) };
}

export async function getHydrated(shopId: Types.ObjectId, id: string) {
  const c = await Catalogue.findOne({ _id: id, shopId }).lean();
  if (!c) return nf();
  const dto = toDto(c as ICatalogue);
  const ids = dto.productIds.map((p) => new Types.ObjectId(p));
  const prods = ids.length
    ? await Product.find({ shopId, _id: { $in: ids }, deletedAt: null })
        .select('name slug sku status primaryImageUrl primaryThumbUrl pricing stockTotal')
        .lean()
    : [];
  const byId = new Map(prods.map((p) => [String(p._id), p]));
  const products = dto.productIds
    .map((pid) => byId.get(pid))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      sku: p.sku ?? null,
      status: p.status,
      imageUrl: p.primaryThumbUrl ?? p.primaryImageUrl ?? null,
      minPriceMinor: p.pricing?.minSellingMinor ?? 0,
      maxPriceMinor: p.pricing?.maxSellingMinor ?? 0,
      mrpMinor: p.pricing?.mrpMinor ?? 0,
      hidePrice: p.pricing?.hidePrice ?? false,
      stockTotal: p.stockTotal,
    }));
  return { ...dto, products };
}

export async function create(shopId: Types.ObjectId, body: CreateBody) {
  await assertWithinLimit(shopId, 'catalogues');
  const ids = await validateProducts(shopId, body.productIds ?? []);
  const slug = body.slug ? await uniqueSlugStrict(shopId, body.slug) : await uniqueSlug(Catalogue, body.name, { shopId });
  const published = body.isPublished ?? false;
  const doc = await Catalogue.create({
    shopId,
    name: body.name,
    slug,
    description: body.description,
    coverUrl: body.coverUrl ?? undefined,
    isPublic: published,
    isActive: true,
    sortOrder: body.sortOrder ?? 0,
    categoryIds: (body.categoryIds ?? []).map((i) => new Types.ObjectId(i)),
    startDate: body.startDate ?? undefined,
    endDate: body.endDate ?? undefined,
    layout: body.layout ?? undefined,
    products: toEmbedded(ids),
  });
  await incrementUsage(shopId, 'catalogues');
  invalidateShopCache(String(shopId));
  return doc;
}

async function uniqueSlugStrict(shopId: Types.ObjectId, slug: string, excludeId?: string): Promise<string> {
  const s = slugify(slug);
  if (!s) throw Errors.badRequest('VALIDATION_ERROR', 'Invalid slug');
  const clash = await Catalogue.exists({ shopId, slug: s, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
  if (clash) throw Errors.conflict('SLUG_TAKEN', 'A catalogue with this slug already exists');
  return s;
}

export async function update(shopId: Types.ObjectId, id: string, body: UpdateBody) {
  const doc = await load(shopId, id);
  const before = toDto(doc.toObject());
  if (body.name !== undefined) doc.name = body.name;
  if (body.slug !== undefined) doc.slug = await uniqueSlugStrict(shopId, body.slug, id);
  if (body.description !== undefined) doc.description = body.description;
  if (body.coverUrl !== undefined) doc.coverUrl = body.coverUrl ?? undefined;
  if (body.sortOrder !== undefined) doc.sortOrder = body.sortOrder;
  if (body.categoryIds !== undefined) doc.categoryIds = body.categoryIds.map((i) => new Types.ObjectId(i));
  if (body.startDate !== undefined) doc.startDate = body.startDate ?? undefined;
  if (body.endDate !== undefined) doc.endDate = body.endDate ?? undefined;
  if (body.layout !== undefined) doc.layout = body.layout ?? undefined;
  if (body.isPublished !== undefined) {
    doc.isPublic = body.isPublished;
    if (body.isPublished) doc.isActive = true;
  }
  if (body.productIds !== undefined) doc.products = toEmbedded(await validateProducts(shopId, body.productIds)) as ICatalogue['products'];
  await doc.save();
  invalidateShopCache(String(shopId));
  return { before, doc };
}

export async function remove(shopId: Types.ObjectId, id: string) {
  const doc = await Catalogue.findOneAndDelete({ _id: id, shopId });
  if (!doc) return nf();
  await decrementUsage(shopId, 'catalogues');
  invalidateShopCache(String(shopId));
  return doc;
}

export async function setProducts(shopId: Types.ObjectId, id: string, productIds: string[]) {
  const ids = await validateProducts(shopId, productIds);
  const doc = await Catalogue.findOneAndUpdate({ _id: id, shopId }, { $set: { products: toEmbedded(ids) } }, { new: true });
  if (!doc) return nf();
  invalidateShopCache(String(shopId));
  return doc;
}

export async function addProducts(shopId: Types.ObjectId, id: string, productIds: string[]) {
  const doc = await load(shopId, id);
  const current = [...doc.products].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => String(p.productId));
  const merged = [...current, ...productIds.filter((p) => !current.includes(p))];
  if (merged.length > 500) throw Errors.badRequest('VALIDATION_ERROR', 'A catalogue can hold at most 500 products');
  return setProducts(shopId, id, merged);
}

export async function removeProducts(shopId: Types.ObjectId, id: string, productIds: string[]) {
  const doc = await load(shopId, id);
  const drop = new Set(productIds);
  const keep = [...doc.products]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => String(p.productId))
    .filter((p) => !drop.has(p));
  // keep ids already stored even if the product was since deleted: skip re-validation of survivors
  doc.products = toEmbedded(keep.map((k) => new Types.ObjectId(k))) as ICatalogue['products'];
  await doc.save();
  invalidateShopCache(String(shopId));
  return doc;
}

export async function setPublished(shopId: Types.ObjectId, id: string, published: boolean) {
  const doc = await Catalogue.findOneAndUpdate(
    { _id: id, shopId },
    { $set: published ? { isPublic: true, isActive: true } : { isPublic: false } },
    { new: true },
  );
  if (!doc) return nf();
  invalidateShopCache(String(shopId));
  return doc;
}

export async function setCover(shopId: Types.ObjectId, id: string, url: string) {
  const doc = await Catalogue.findOneAndUpdate({ _id: id, shopId }, { $set: { coverUrl: url } }, { new: true });
  if (!doc) return nf();
  invalidateShopCache(String(shopId));
  return doc;
}

export const publicUrl = (shopSlug: string, catalogueSlug: string): string =>
  `${env.FRONTEND_URL.replace(/\/+$/, '')}/shop/${shopSlug}/catalogue/${catalogueSlug}`;

export async function getShare(shopId: Types.ObjectId, shopSlug: string, shopName: string | undefined, id: string) {
  const c = await Catalogue.findOne({ _id: id, shopId }).select('name slug isPublic isActive').lean();
  if (!c) return nf();
  const url = publicUrl(shopSlug, c.slug);
  const text = `Check out our "${c.name}" collection${shopName ? ` at ${shopName}` : ''}: ${url}`;
  return {
    url,
    isPublished: c.isPublic && c.isActive,
    whatsappText: text,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}`,
  };
}
