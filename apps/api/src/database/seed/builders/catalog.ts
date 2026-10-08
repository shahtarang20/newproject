import { STANDARD_SIZES, type ProductStatus, type SareeWorkType } from '@vastra/shared';
import type { Types } from 'mongoose';
import { slugify } from '@/common/slug';
import type { ICategory } from '@/database/models/category.model';
import type { IMedia } from '@/database/models/media.model';
import type { IProduct, IProductMediaRef } from '@/database/models/product.model';
import type { IProductVariant } from '@/database/models/product-variant.model';
import { hexOf } from '../data/products';
import { DAY_MS, type Rng } from '../prng';
import type { BuiltProduct, ProductSpec, ShopContext } from '../types';
import { imageUrl, newId, pad, rp } from '../util';

export interface CatalogPlan {
  categories: ICategory[];
  categoryIdBySlug: Map<string, Types.ObjectId>;
  built: BuiltProduct[];
  media: IMedia[];
  storageBytes: number;
}

const rank = (s: string): number => {
  const i = (STANDARD_SIZES as readonly string[]).indexOf(s.toUpperCase());
  return i === -1 ? 1000 : i;
};

/** Re-derives the denormalised product summary exactly like products/product.summary.ts does for ACTIVE variants. */
export function applySummary(product: IProduct, variants: IProductVariant[]): void {
  const active = variants.filter((v) => v.isActive);
  const prices = active.map((v) => v.sellingPriceMinor);
  const discounts = active.map((v) => (v.mrpMinor > v.sellingPriceMinor ? Math.round(((v.mrpMinor - v.sellingPriceMinor) / v.mrpMinor) * 100) : 0));
  product.pricing.minSellingMinor = prices.length ? Math.min(...prices) : 0;
  product.pricing.maxSellingMinor = prices.length ? Math.max(...prices) : 0;
  product.pricing.mrpMinor = active.length ? Math.max(...active.map((v) => v.mrpMinor)) : 0;
  product.pricing.discountPercent = discounts.length ? Math.max(...discounts) : 0;
  product.colours = [...new Set(active.map((v) => v.colour?.name).filter((c): c is string => Boolean(c)))];
  product.sizes = [...new Set(active.map((v) => v.size).filter((s): s is string => Boolean(s)))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  product.stockTotal = active.reduce((n, v) => n + Math.max(0, v.stock), 0);
  if (active.length > 0 && product.stockTotal === 0 && product.status === 'ACTIVE') product.status = 'OUT_OF_STOCK';
  else if (product.stockTotal > 0 && product.status === 'OUT_OF_STOCK') product.status = 'ACTIVE';
}

function stockFor(spec: ProductSpec, rng: Rng): number {
  const saree = spec.type === 'SAREE';
  switch (spec.stock ?? 'normal') {
    case 'out': return 0;
    case 'low': return rng.chance(0.35) ? 0 : rng.int(1, 4);
    case 'high': return saree ? rng.int(10, 20) : rng.int(25, 60);
    default: return rng.chance(0.08) ? 0 : saree ? rng.int(3, 12) : rng.int(6, 30);
  }
}

function buildProduct(ctx: ShopContext, spec: ProductSpec, index: number, rng: Rng, now: Date, media: IMedia[], variantsOut: IProductVariant[], catId: Types.ObjectId): BuiltProduct {
  const { def, shopId, ownerId } = ctx;
  const saree = spec.type === 'SAREE';
  const productId = newId();
  const slug = slugify(spec.name);
  const createdAt = new Date(now.getTime() - (70 + ((index * 7) % 16)) * DAY_MS);
  const skuBase = `${def.prefix}-${pad(index + 1, 3)}`;

  // Media (placeholder URLs only; nothing is uploaded).
  const nImages = rng.int(2, 3);
  const refs: IProductMediaRef[] = [];
  const mediaIds: Types.ObjectId[] = [];
  for (let n = 1; n <= nImages; n++) {
    const mediaId = newId();
    const seedKey = `${def.slug}-${slug}-${n}`;
    const url = imageUrl(seedKey, 800, 1000);
    const thumbUrl = imageUrl(seedKey, 320, 400);
    media.push({
      _id: mediaId, shopId, productId, kind: 'IMAGE', url, thumbUrl, key: `seed/${def.slug}/${slug}-${n}`, provider: 'external', mimeType: 'image/jpeg',
      sizeBytes: rng.int(90_000, 180_000), width: 800, height: 1000, altText: `${spec.name} - view ${n}`, isPrimary: n === 1, sortOrder: n - 1,
      uploadedBy: ownerId, createdAt, updatedAt: createdAt,
    });
    refs.push({ mediaId, kind: 'IMAGE', url, thumbUrl, isPrimary: n === 1, sortOrder: n - 1 });
    mediaIds.push(mediaId);
  }

  const status: ProductStatus = spec.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE';
  const taxPercent = spec.price <= 2500 ? 5 : 18;
  const sr = spec.sr;
  const ga = spec.ga?.split('|');
  const product: IProduct = {
    _id: productId, shopId, deletedAt: null, type: spec.type, name: spec.name, slug, sku: skuBase, brand: spec.brand ?? def.name,
    description: `${spec.blurb} Sold by ${def.name}, ${def.address.city}. Colours and sizes available as listed; image shades may vary slightly from the actual product.`,
    shortDescription: spec.blurb, categoryId: catId, tags: spec.tags, gender: spec.gender, occasions: spec.occ, fabric: spec.fabric,
    season: spec.tags.includes('winter') ? 'WINTER' : spec.tags.includes('summer') ? 'SUMMER' : 'ALL_SEASON',
    sareeAttrs: saree && sr
      ? {
          sareeType: sr[0], fabric: spec.fabric, workTypes: sr[1] as SareeWorkType[], lengthMeters: rng.chance(0.7) ? 6.3 : 5.5, blouseIncluded: true,
          blouseDescription: 'Unstitched matching blouse piece (0.8 m)', border: sr[2], pallu: sr[3], weave: sr[4],
          careInstructions: spec.fabric === 'COTTON' ? 'Hand wash cold, dry in shade.' : 'Dry clean only.',
        }
      : undefined,
    garmentAttrs: !saree && ga
      ? { fit: ga[0], pattern: ga[1], sleeveType: ga[2], neckType: ga[3], fabricComposition: ga[4], washCare: 'Machine wash cold. Do not bleach. Iron on low heat.' }
      : undefined,
    pricing: { minSellingMinor: 0, maxSellingMinor: 0, mrpMinor: 0, discountPercent: 0, taxPercent, hidePrice: false },
    colours: [], sizes: [], stockTotal: 0, lowStockThreshold: saree ? 3 : 5, status, isFeatured: Boolean(spec.featured),
    media: refs, mediaIds, primaryImageUrl: refs[0].url, primaryThumbUrl: refs[0].thumbUrl,
    seo: { title: `${spec.name} | ${def.name}`, description: spec.blurb.slice(0, 150) },
    viewCount: 0, soldCount: 0, shareCount: 0, createdAt, updatedAt: createdAt,
  };

  const variants: IProductVariant[] = [];
  spec.colours.forEach((colour, ci) => {
    spec.sizes.forEach((size, si) => {
      const extra = !saree && spec.sizes.length > 4 && si >= 3 ? rp(100) : 0;
      const selling = rp(spec.price) + extra;
      variants.push({
        _id: newId(), shopId, productId, sku: `${skuBase}-C${ci + 1}-${size.replace(/[^A-Za-z0-9]/g, '')}`, colour: { name: colour, hex: hexOf(colour) }, size,
        sellingPriceMinor: selling, mrpMinor: rp(spec.mrp) + extra, costPriceMinor: Math.round((selling * 0.6) / 100) * 100, stock: stockFor(spec, rng),
        imageUrl: refs[0].url, imageMediaId: refs[0].mediaId, isActive: true, createdAt, updatedAt: createdAt,
      });
    });
  });
  if (spec.stock === 'low' && variants.every((v) => v.stock === 0)) variants[0].stock = 2;
  variantsOut.push(...variants);
  applySummary(product, variants);
  return { product, spec, variants };
}

export function planCatalog(ctx: ShopContext, specs: ProductSpec[], rng: Rng, now: Date): CatalogPlan {
  const { def, shopId } = ctx;
  const created = new Date(now.getTime() - 90 * DAY_MS);
  const categoryIdBySlug = new Map<string, Types.ObjectId>();
  def.categories.forEach((c) => categoryIdBySlug.set(c.slug, newId()));
  const categories: ICategory[] = def.categories.map((c, i) => ({
    _id: categoryIdBySlug.get(c.slug) as Types.ObjectId, shopId, name: c.name, slug: c.slug, parentId: c.parent ? (categoryIdBySlug.get(c.parent) ?? null) : null,
    description: c.description, imageUrl: imageUrl(`${def.slug}-cat-${c.slug}`, 600, 400), sortOrder: i, isActive: true, createdAt: created, updatedAt: created,
  }));

  const media: IMedia[] = [];
  const allVariants: IProductVariant[] = [];
  const built = specs.map((spec, i) => {
    const catId = categoryIdBySlug.get(spec.cat);
    if (!catId) throw new Error(`Seed data error: unknown category "${spec.cat}" for product "${spec.name}" in ${def.slug}`);
    return buildProduct(ctx, spec, i, rng, now, media, allVariants, catId);
  });
  const storageBytes = media.reduce((n, m) => n + m.sizeBytes, 0);
  return { categories, categoryIdBySlug, built, media, storageBytes };
}
