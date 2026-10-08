import { Types, type PipelineStage } from 'mongoose';
import type { PaginationMeta } from '@vastra/shared';
import { Errors } from '@/common/errors';
import { buildMeta } from '@/common/pagination';
import { publicCache } from '@/common/utils/cache';
import { Shop } from '@/database/models/shop.model';
import { Product, type IProduct } from '@/database/models/product.model';
import { ProductVariant, type IProductVariant } from '@/database/models/product-variant.model';
import { Category, type ICategory } from '@/database/models/category.model';
import { Catalogue } from '@/database/models/catalogue.model';
import { Offer, type IOffer } from '@/database/models/offer.model';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/config/constants';
import {
  toActiveOffer,
  toPublicCatalogue,
  toPublicCategory,
  toPublicOffer,
  toPublicProduct,
  toPublicShop,
  type ActiveOffer,
  type ProductMapContext,
  type PublicCatalogue,
  type PublicCategory,
  type PublicOffer,
  type PublicProduct,
  type PublicShop,
} from './storefront.mapper';
import type { ProductsQuery } from './storefront.schemas';

export { toPublicProduct };

const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SHOP_TTL = 60_000;
const LIST_TTL = 30_000;

type Lean<T> = T & { _id: Types.ObjectId };

// ------------------------------------------------------------------ shop
/** Public shop profile by slug (cached 60s). 404 SHOP_NOT_FOUND for unknown / pending / suspended shops. */
export async function getPublicShopBySlug(slug: string): Promise<PublicShop> {
  const key = `slug:${slug.toLowerCase()}:public`;
  const cached = publicCache.get(key) as PublicShop | undefined;
  if (cached) return cached;
  const shop = await Shop.findOne({ slug: slug.toLowerCase() }).lean();
  if (!shop || shop.status !== 'ACTIVE') throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  const dto = toPublicShop(shop);
  publicCache.set(key, dto, SHOP_TTL);
  return dto;
}

// ------------------------------------------------------------------ shared context (categories, offers, low-stock)
interface ShopCtx {
  categories: Lean<ICategory>[];
  offers: IOffer[];
  lowStockThreshold: number;
  currency: string;
}

async function loadShopCtx(shopId: string): Promise<ShopCtx> {
  return publicCache.wrap(
    `shop:${shopId}:ctx`,
    async () => {
      const now = new Date();
      const [categories, offers, shop] = await Promise.all([
        Category.find({ shopId: oid(shopId), isActive: true })
          .select('name slug parentId imageUrl sortOrder')
          .sort({ sortOrder: 1, name: 1 })
          .lean<Lean<ICategory>[]>(),
        Offer.find({
          shopId: oid(shopId),
          isActive: true,
          $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
        })
          .sort({ createdAt: -1 })
          .lean<IOffer[]>(),
        Shop.findById(shopId).select('notificationSettings.lowStockThreshold currency').lean(),
      ]);
      return { categories, offers, lowStockThreshold: shop?.notificationSettings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD, currency: shop?.currency ?? 'INR' };
    },
    LIST_TTL,
  ) as Promise<ShopCtx>;
}

function mapCtx(ctx: ShopCtx, maxMedia?: number): ProductMapContext {
  const categories = new Map(ctx.categories.map((c) => [String(c._id), { id: String(c._id), name: c.name, slug: c.slug }]));
  const offers: ActiveOffer[] = ctx.offers.map((o) => toActiveOffer(o, ctx.currency));
  return { categories, offers, lowStockThreshold: ctx.lowStockThreshold, maxMedia };
}

function descendantIds(categories: Lean<ICategory>[], rootId: string): string[] {
  const out = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length) {
    const next: string[] = [];
    for (const c of categories) {
      const pid = c.parentId ? String(c.parentId) : null;
      if (pid && frontier.includes(pid) && !out.has(String(c._id))) {
        out.add(String(c._id));
        next.push(String(c._id));
      }
    }
    frontier = next;
  }
  return [...out];
}

// ------------------------------------------------------------------ categories
export async function listCategories(shopId: string): Promise<PublicCategory[]> {
  return publicCache.wrap(
    `shop:${shopId}:categories`,
    async () => {
      const ctx = await loadShopCtx(shopId);
      const counts = await Product.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { shopId: oid(shopId), status: 'ACTIVE', deletedAt: null, categoryId: { $ne: null } } },
        { $group: { _id: '$categoryId', n: { $sum: 1 } } },
      ]);
      const own = new Map(counts.map((c) => [String(c._id), c.n]));
      const out: PublicCategory[] = [];
      for (const c of ctx.categories) {
        const total = descendantIds(ctx.categories, String(c._id)).reduce((n, id) => n + (own.get(id) ?? 0), 0);
        if (total > 0) out.push(toPublicCategory(c, total));
      }
      return out;
    },
    LIST_TTL,
  ) as Promise<PublicCategory[]>;
}

// ------------------------------------------------------------------ products
const PRODUCT_SELECT = '-mediaIds -shareCount -deletedAt -__v';
const PRODUCT_AGG_PROJECT = { mediaIds: 0, shareCount: 0, deletedAt: 0, __v: 0, _popularity: 0, _discount: 0 };
const VARIANT_SELECT = '-costPriceMinor -barcode -createdAt -updatedAt -__v';

async function attachVariants(shopId: string, docs: Lean<IProduct>[], ctx: ShopCtx, maxMedia?: number): Promise<PublicProduct[]> {
  if (!docs.length) return [];
  const variants = await ProductVariant.find({ shopId: oid(shopId), productId: { $in: docs.map((d) => d._id) }, isActive: true })
    .select(VARIANT_SELECT)
    .sort({ sellingPriceMinor: 1 })
    .lean<Lean<IProductVariant>[]>();
  const byProduct = new Map<string, Lean<IProductVariant>[]>();
  for (const v of variants) {
    const k = String(v.productId);
    const list = byProduct.get(k);
    if (list) list.push(v);
    else byProduct.set(k, [v]);
  }
  const mc = mapCtx(ctx, maxMedia);
  return docs.map((d) => toPublicProduct(d, byProduct.get(String(d._id)) ?? [], mc));
}

const normaliseKey = (q: ProductsQuery): string =>
  JSON.stringify({
    ...q,
    q: q.q?.toLowerCase(),
    colour: q.colour && [...q.colour].sort(),
    size: q.size && [...q.size].sort(),
    fabric: q.fabric && [...q.fabric].sort(),
    brand: q.brand && [...q.brand].sort(),
    occasion: q.occasion && [...q.occasion].sort(),
  });

export interface ProductListResult {
  data: PublicProduct[];
  meta: PaginationMeta;
}

const emptyList = (q: ProductsQuery): ProductListResult => ({ data: [], meta: buildMeta(q.page, q.limit, 0) });

/** Lean, projected, cached (30s per shop+normalised query) product listing. */
export async function listProducts(shopId: string, query: ProductsQuery): Promise<ProductListResult> {
  return publicCache.wrap(`shop:${shopId}:products:${normaliseKey(query)}`, () => runProductList(shopId, query), LIST_TTL) as Promise<ProductListResult>;
}

async function runProductList(shopId: string, q: ProductsQuery): Promise<ProductListResult> {
  const ctx = await loadShopCtx(shopId);
  const and: Record<string, unknown>[] = [];
  const base: Record<string, unknown> = { shopId: oid(shopId), status: 'ACTIVE', deletedAt: null };

  if (q.category) {
    const cat = ctx.categories.find((c) => c.slug === q.category);
    if (!cat) return emptyList(q);
    base.categoryId = { $in: descendantIds(ctx.categories, String(cat._id)).map(oid) };
  }

  let catalogueOrder: string[] | null = null;
  if (q.catalogue) {
    const cat = await Catalogue.findOne(catalogueWindow(shopId, { slug: q.catalogue })).select('products').lean();
    if (!cat) throw Errors.notFound('CATALOGUE_NOT_FOUND', 'Catalogue not found');
    const sorted = [...cat.products].sort((a, b) => a.sortOrder - b.sortOrder);
    catalogueOrder = sorted.map((p) => String(p.productId));
    base._id = { $in: sorted.map((p) => p.productId) };
  }

  if (q.colour?.length) base.colours = { $in: q.colour };
  if (q.size?.length) base.sizes = { $in: q.size };
  if (q.brand?.length) base.brand = { $in: q.brand };
  if (q.occasion?.length) base.occasions = { $in: q.occasion.map((o) => o.toUpperCase()) };
  if (q.gender) base.gender = q.gender;
  if (q.fabric?.length) {
    const f = q.fabric.map((x) => x.toUpperCase());
    and.push({ $or: [{ fabric: { $in: f } }, { 'sareeAttrs.fabric': { $in: f } }] });
  }
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    const range: Record<string, number> = {};
    if (q.minPrice !== undefined) range.$gte = q.minPrice;
    if (q.maxPrice !== undefined) range.$lte = q.maxPrice;
    base['pricing.minSellingMinor'] = range;
    base['pricing.hidePrice'] = { $ne: true };
  }
  if (q.inStock) base.stockTotal = { $gt: 0 };
  if (q.onOffer) {
    const offers = ctx.offers.map((o) => toActiveOffer(o, ctx.currency));
    if (!offers.length) return emptyList(q);
    if (!offers.some((o) => o.scope === 'ALL')) {
      const pids = [...new Set(offers.flatMap((o) => [...o.productIds]))].map(oid);
      const cids = [...new Set(offers.flatMap((o) => [...o.categoryIds]))].map(oid);
      and.push({ $or: [...(pids.length ? [{ _id: { $in: pids } }] : []), ...(cids.length ? [{ categoryId: { $in: cids } }] : [])] });
      if (and[and.length - 1].$or && (and[and.length - 1].$or as unknown[]).length === 0) return emptyList(q);
    }
  }

  const withAnd = (extra: Record<string, unknown>[] = []): Record<string, unknown> => {
    const all = [...and, ...extra];
    return all.length ? { ...base, $and: all } : { ...base };
  };

  const searchText = q.q?.trim();
  const skip = (q.page - 1) * q.limit;

  const exec = async (filter: Record<string, unknown>, relevance: boolean): Promise<ProductListResult> => {
    const total = await Product.countDocuments(filter);
    if (total === 0) return emptyList(q);
    let docs: Lean<IProduct>[];

    if (catalogueOrder && !q.sort && !searchText) {
      const ids = (await Product.find(filter).select('_id').lean()).map((r) => String(r._id));
      const present = new Set(ids);
      const ordered = catalogueOrder.filter((id) => present.has(id));
      const pageIds = ordered.slice(skip, skip + q.limit);
      const rows = await Product.find({ _id: { $in: pageIds.map(oid) }, shopId: oid(shopId) }).select(PRODUCT_SELECT).lean<Lean<IProduct>[]>();
      const map = new Map(rows.map((r) => [String(r._id), r]));
      docs = pageIds.map((id) => map.get(id)).filter((r): r is Lean<IProduct> => Boolean(r));
      return { data: await attachVariants(shopId, docs, ctx, 4), meta: buildMeta(q.page, q.limit, ordered.length) };
    }

    if (q.sort === 'popular' || q.sort === 'discount') {
      const addFields: Record<string, unknown> =
        q.sort === 'popular'
          ? { _popularity: { $add: [{ $multiply: ['$soldCount', 3] }, '$viewCount'] } }
          : {
              _discount: {
                $cond: [
                  { $and: [{ $gt: ['$pricing.mrpMinor', '$pricing.minSellingMinor'] }, { $gt: ['$pricing.mrpMinor', 0] }, { $ne: ['$pricing.hidePrice', true] }] },
                  { $divide: [{ $subtract: ['$pricing.mrpMinor', '$pricing.minSellingMinor'] }, '$pricing.mrpMinor'] },
                  0,
                ],
              },
            };
      const pipeline: PipelineStage[] = [
        { $match: filter },
        { $addFields: addFields },
        { $sort: q.sort === 'popular' ? { _popularity: -1, createdAt: -1, _id: -1 } : { _discount: -1, createdAt: -1, _id: -1 } },
        { $skip: skip },
        { $limit: q.limit },
        { $project: PRODUCT_AGG_PROJECT },
      ];
      docs = await Product.aggregate<Lean<IProduct>>(pipeline);
    } else {
      const sort: Record<string, 1 | -1 | { $meta: 'textScore' }> =
        q.sort === 'price_asc'
          ? { 'pricing.minSellingMinor': 1, _id: 1 }
          : q.sort === 'price_desc'
            ? { 'pricing.minSellingMinor': -1, _id: 1 }
            : relevance && !q.sort
              ? { score: { $meta: 'textScore' }, createdAt: -1 }
              : { createdAt: -1, _id: -1 };
      let cursor = Product.find(filter).select(PRODUCT_SELECT);
      if (relevance) cursor = cursor.select({ score: { $meta: 'textScore' } });
      docs = await cursor.sort(sort).skip(skip).limit(q.limit).lean<Lean<IProduct>[]>();
    }
    return { data: await attachVariants(shopId, docs, ctx, 4), meta: buildMeta(q.page, q.limit, total) };
  };

  if (!searchText) return exec(withAnd(), false);

  // 1) text index (whole-word, stemmed) 2) regex fallback over all searchable fields (substring match).
  const viaText = await exec({ ...withAnd(), $text: { $search: searchText } }, true);
  if (viaText.meta.total > 0) return viaText;

  const rx = new RegExp(escapeRegex(searchText), 'i');
  const catIds = ctx.categories.filter((c) => rx.test(c.name)).flatMap((c) => descendantIds(ctx.categories, String(c._id)).map(oid));
  const ors: Record<string, unknown>[] = [
    { name: rx }, { sku: rx }, { brand: rx }, { tags: rx }, { colours: rx }, { sizes: rx }, { fabric: rx }, { 'sareeAttrs.fabric': rx },
  ];
  if (catIds.length) ors.push({ categoryId: { $in: catIds } });
  return exec(withAnd([{ $or: ors }]), false);
}

export async function getProductBySlug(shopId: string, slug: string): Promise<PublicProduct> {
  return publicCache.wrap(
    `shop:${shopId}:product:${slug}`,
    async () => {
      const doc = await Product.findOne({ shopId: oid(shopId), slug, status: 'ACTIVE', deletedAt: null }).select(PRODUCT_SELECT).lean<Lean<IProduct> | null>();
      if (!doc) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
      const ctx = await loadShopCtx(shopId);
      return (await attachVariants(shopId, [doc], ctx))[0];
    },
    LIST_TTL,
  ) as Promise<PublicProduct>;
}

/** Fire-and-forget view counter. Never throws. */
export function bumpProductView(shopId: string, productId: string): void {
  Product.updateOne({ _id: oid(productId), shopId: oid(shopId) }, { $inc: { viewCount: 1 } }).catch(() => undefined);
}

export async function getRelatedProducts(shopId: string, productSlug: string, limit = 8): Promise<PublicProduct[]> {
  return publicCache.wrap(
    `shop:${shopId}:related:${productSlug}:${limit}`,
    async () => {
      const p = await Product.findOne({ shopId: oid(shopId), slug: productSlug, status: 'ACTIVE', deletedAt: null }).select('categoryId type').lean();
      if (!p) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
      const base = { shopId: oid(shopId), status: 'ACTIVE', deletedAt: null, _id: { $ne: p._id } };
      let docs: Lean<IProduct>[] = [];
      if (p.categoryId) {
        docs = await Product.find({ ...base, categoryId: p.categoryId }).select(PRODUCT_SELECT).sort({ soldCount: -1, createdAt: -1 }).limit(limit).lean<Lean<IProduct>[]>();
      }
      if (docs.length < limit) {
        const have = [p._id, ...docs.map((d) => d._id)];
        const more = await Product.find({ ...base, _id: { $nin: have }, type: p.type })
          .select(PRODUCT_SELECT)
          .sort({ soldCount: -1, createdAt: -1 })
          .limit(limit - docs.length)
          .lean<Lean<IProduct>[]>();
        docs = [...docs, ...more];
      }
      return attachVariants(shopId, docs, await loadShopCtx(shopId), 4);
    },
    LIST_TTL,
  ) as Promise<PublicProduct[]>;
}

// ------------------------------------------------------------------ facets
export interface Facets {
  colours: { name: string; hex?: string; count: number }[];
  sizes: { name: string; count: number }[];
  fabrics: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  occasions: { name: string; count: number }[];
  categories: PublicCategory[];
  price: { minMinor: number; maxMinor: number };
}

interface NamedCount {
  _id: string | null;
  count: number;
}

export async function getFacets(shopId: string): Promise<Facets> {
  return publicCache.wrap(
    `shop:${shopId}:facets`,
    async () => {
      const match = { shopId: oid(shopId), status: 'ACTIVE', deletedAt: null };
      const group = (field: string): PipelineStage.FacetPipelineStage[] => [
        { $match: { [field.replace('$', '')]: { $nin: [null, ''] } } },
        { $group: { _id: field, count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 60 },
      ];
      const unwind = (field: string): PipelineStage.FacetPipelineStage[] => [{ $unwind: field }, ...group(field)];

      const [facetRes, hexRows, categories] = await Promise.all([
        Product.aggregate<{
          colours: NamedCount[]; sizes: NamedCount[]; fabrics: NamedCount[]; brands: NamedCount[]; occasions: NamedCount[];
          price: { _id: null; min: number; max: number }[];
        }>([
          { $match: match },
          { $addFields: { _fabric: { $ifNull: ['$fabric', '$sareeAttrs.fabric'] } } },
          {
            $facet: {
              colours: unwind('$colours'),
              sizes: unwind('$sizes'),
              fabrics: group('$_fabric'),
              brands: group('$brand'),
              occasions: unwind('$occasions'),
              price: [
                { $match: { 'pricing.hidePrice': { $ne: true }, 'pricing.minSellingMinor': { $gt: 0 } } },
                { $group: { _id: null, min: { $min: '$pricing.minSellingMinor' }, max: { $max: '$pricing.maxSellingMinor' } } },
              ],
            },
          },
        ]),
        ProductVariant.aggregate<{ _id: string; hex?: string }>([
          { $match: { shopId: oid(shopId), isActive: true, 'colour.name': { $nin: [null, ''] } } },
          { $group: { _id: '$colour.name', hex: { $first: '$colour.hex' } } },
        ]),
        listCategories(shopId),
      ]);
      const f = facetRes[0];
      const hex = new Map(hexRows.map((h) => [h._id, h.hex]));
      const named = (rows: NamedCount[]) => rows.filter((r) => r._id).map((r) => ({ name: String(r._id), count: r.count }));
      const p = f?.price?.[0];
      return {
        colours: named(f?.colours ?? []).map((c) => ({ ...c, ...(hex.get(c.name) ? { hex: hex.get(c.name) } : {}) })),
        sizes: named(f?.sizes ?? []),
        fabrics: named(f?.fabrics ?? []),
        brands: named(f?.brands ?? []),
        occasions: named(f?.occasions ?? []),
        categories,
        price: { minMinor: p?.min ?? 0, maxMinor: Math.max(p?.max ?? 0, p?.min ?? 0) },
      } satisfies Facets;
    },
    60_000,
  ) as Promise<Facets>;
}

// ------------------------------------------------------------------ catalogues
/** Published catalogues whose optional start/end window includes "now". */
const catalogueWindow = (shopId: string, extra: Record<string, unknown> = {}) => {
  const now = new Date();
  return {
    shopId: oid(shopId),
    isActive: true,
    isPublic: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] },
    ],
    ...extra,
  };
};

export async function listCatalogues(shopId: string): Promise<PublicCatalogue[]> {
  return publicCache.wrap(
    `shop:${shopId}:catalogues`,
    async () => {
      const cats = await Catalogue.find(catalogueWindow(shopId)).sort({ sortOrder: 1, createdAt: -1 }).lean();
      if (!cats.length) return [];
      const allIds = [...new Set(cats.flatMap((c) => c.products.map((p) => String(p.productId))))];
      const live = await Product.find({ shopId: oid(shopId), _id: { $in: allIds.map(oid) }, status: 'ACTIVE', deletedAt: null })
        .select('primaryImageUrl')
        .lean();
      const liveMap = new Map(live.map((p) => [String(p._id), p.primaryImageUrl]));
      const out: PublicCatalogue[] = [];
      for (const c of cats) {
        const ids = c.products.filter((p) => liveMap.has(String(p.productId))).sort((a, b) => a.sortOrder - b.sortOrder);
        if (!ids.length) continue; // hide empty catalogues
        out.push(toPublicCatalogue(c, ids.length, liveMap.get(String(ids[0].productId))));
      }
      return out;
    },
    LIST_TTL,
  ) as Promise<PublicCatalogue[]>;
}

export async function getCatalogueBySlug(shopId: string, slug: string): Promise<PublicCatalogue> {
  const c = await Catalogue.findOne(catalogueWindow(shopId, { slug })).lean();
  if (!c) throw Errors.notFound('CATALOGUE_NOT_FOUND', 'Catalogue not found');
  const ids = c.products.sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.productId);
  const live = await Product.find({ shopId: oid(shopId), _id: { $in: ids }, status: 'ACTIVE', deletedAt: null }).select('primaryImageUrl').lean();
  const liveMap = new Map(live.map((p) => [String(p._id), p.primaryImageUrl]));
  const first = ids.find((id) => liveMap.has(String(id)));
  Catalogue.updateOne({ _id: c._id }, { $inc: { viewCount: 1 } }).catch(() => undefined);
  return toPublicCatalogue(c, liveMap.size, first ? liveMap.get(String(first)) : undefined);
}

// ------------------------------------------------------------------ offers
export async function listOffers(shopId: string): Promise<PublicOffer[]> {
  const ctx = await loadShopCtx(shopId);
  return ctx.offers.map(toPublicOffer);
}

// ------------------------------------------------------------------ sitemap
export async function getSitemapData(shopId: string) {
  return publicCache.wrap(
    `shop:${shopId}:sitemap`,
    async () => {
      const [products, catalogues] = await Promise.all([
        Product.find({ shopId: oid(shopId), status: 'ACTIVE', deletedAt: null }).select('slug updatedAt').sort({ updatedAt: -1 }).limit(5000).lean(),
        Catalogue.find(catalogueWindow(shopId)).select('slug updatedAt').lean(),
      ]);
      const row = (r: { slug: string; updatedAt: Date }) => ({ slug: r.slug, updatedAt: new Date(r.updatedAt).toISOString() });
      return { products: products.map(row), catalogues: catalogues.map(row) };
    },
    60_000,
  ) as Promise<{ products: { slug: string; updatedAt: string }[]; catalogues: { slug: string; updatedAt: string }[] }>;
}
