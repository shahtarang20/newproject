import { STANDARD_SIZES } from '@vastra/shared';
import type { IProduct } from '@/database/models/product.model';
import type { IProductVariant } from '@/database/models/product-variant.model';
import type { IShop } from '@/database/models/shop.model';
import type { ICategory } from '@/database/models/category.model';
import type { ICatalogue } from '@/database/models/catalogue.model';
import type { IOffer } from '@/database/models/offer.model';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/config/constants';

/**
 * Public DTOs — MUST mirror apps/web/src/types/storefront.ts exactly.
 * (Duplicated structurally here because the API cannot import from the web app.)
 */
export interface PublicBusinessHour { day: string; open: boolean; openTime?: string; closeTime?: string }
export interface PublicShop {
  id: string; slug: string; name: string; description?: string; businessType: string; logoUrl?: string; coverUrl?: string;
  address: { line1?: string; line2?: string; city?: string; state?: string; country?: string; pincode?: string };
  phone?: string; whatsapp?: string; email?: string; instagram?: string; facebook?: string;
  businessHours: PublicBusinessHour[]; currency: string;
  theme: { templateId: string; primaryColor?: string; buttonStyle: string; catalogueLayout: string };
  payment: { codEnabled: boolean; onlineEnabled: boolean; payAtShopEnabled: boolean };
  seo?: { title?: string; description?: string; ogImageUrl?: string };
  whatsappEnabled: boolean;
}
export interface PublicCategory { id: string; name: string; slug: string; imageUrl?: string; parentId?: string | null; productCount?: number }
export interface PublicMedia { id: string; kind: 'IMAGE' | 'VIDEO'; url: string; thumbUrl?: string; width?: number; height?: number; durationSec?: number; alt?: string; isPrimary?: boolean }
export interface PublicVariant {
  id: string; sku: string; colour?: string; colourHex?: string; size?: string; priceMinor: number; mrpMinor?: number;
  inStock: boolean; stockLeft?: number; imageUrl?: string;
}
export interface PublicProduct {
  id: string; slug: string; name: string; sku?: string; description?: string; type: string; brand?: string; gender?: string;
  fabric?: string; occasion?: string[]; tags?: string[]; category?: { id: string; name: string; slug: string };
  media: PublicMedia[]; primaryImageUrl?: string; primaryThumbUrl?: string;
  price: { sellingMinor?: number; maxSellingMinor?: number; mrpMinor?: number; discountPercent?: number; hidden: boolean };
  colours: { name: string; hex?: string }[]; sizes: string[]; variants: PublicVariant[]; inStock: boolean; lowStock: boolean; offerBadge?: string;
  sareeAttrs?: {
    sareeType?: string; length?: string; blouseIncluded?: boolean; blouseLength?: string; workTypes?: string[];
    borderType?: string; pattern?: string; washCare?: string;
  };
  garmentAttrs?: { fit?: string; sleeveType?: string; neckType?: string; pattern?: string; washCare?: string };
  seo?: { title?: string; description?: string };
  createdAt: string;
}
export interface PublicCatalogue {
  id: string; slug: string; name: string; description?: string; coverUrl?: string; productCount: number; startDate?: string; endDate?: string;
}
export interface PublicOffer {
  id: string; name: string; description?: string; discountType: string; discountValue: number; couponCode?: string; minOrderMinor?: number; endDate?: string;
}

// ------------------------------------------------------------------ offers
export interface ActiveOffer {
  badge: string;
  scope: IOffer['scope'];
  productIds: Set<string>;
  categoryIds: Set<string>;
}

/**
 * Badge shown next to the price. Worded as an EXTRA saving because the displayed price already includes any
 * MRP discount ("29% OFF"); offers are applied on top at checkout. An owner-defined `badgeText` always wins.
 */
export function offerBadgeText(o: Pick<IOffer, 'badgeText' | 'discountType' | 'value' | 'buyQty' | 'getQty'>, currency = 'INR'): string {
  if (o.badgeText) return o.badgeText;
  if (o.discountType === 'PERCENT') return `Extra ${o.value}% off`;
  if (o.discountType === 'FLAT') {
    const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(o.value / 100);
    return `Extra ${amount} off`;
  }
  return `Buy ${o.buyQty ?? 1} Get ${o.getQty ?? 1} free`;
}

export function toActiveOffer(o: IOffer, currency = 'INR'): ActiveOffer {
  return {
    badge: offerBadgeText(o, currency),
    scope: o.scope,
    productIds: new Set((o.productIds ?? []).map(String)),
    categoryIds: new Set((o.categoryIds ?? []).map(String)),
  };
}

export function findOfferBadge(offers: ActiveOffer[], productId: string, categoryId?: string | null): string | undefined {
  for (const o of offers) {
    if (o.scope === 'ALL') return o.badge;
    if (o.scope === 'PRODUCTS' && o.productIds.has(productId)) return o.badge;
    if (o.scope === 'CATEGORIES' && categoryId && o.categoryIds.has(categoryId)) return o.badge;
  }
  return undefined;
}

// ------------------------------------------------------------------ products
export interface ProductMapContext {
  categories: Map<string, { id: string; name: string; slug: string }>;
  offers: ActiveOffer[];
  /** Shop-level low-stock threshold (falls back to the product/variant one). */
  lowStockThreshold?: number;
  /** Max media items to include (list views send fewer). */
  maxMedia?: number;
}

const sizeRank = (s: string): number => {
  const i = (STANDARD_SIZES as readonly string[]).indexOf(s.toUpperCase());
  return i === -1 ? 100 : i;
};

const clean = <T extends Record<string, unknown>>(o: T): T => {
  for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === null) delete o[k];
  return o;
};

const truncate = (s: string | undefined, n: number): string | undefined => {
  if (!s) return undefined;
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Variant fields that must never leave the server are simply not copied (cost, barcode, exact stock). */
export function toPublicProduct(p: IProduct, variantDocs: IProductVariant[], ctx: ProductMapContext): PublicProduct {
  const id = String(p._id);
  const hidden = Boolean(p.pricing?.hidePrice);
  const fallbackLow = ctx.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const productLow = p.lowStockThreshold ?? fallbackLow;

  const active = variantDocs.filter((v) => v.isActive);
  const variants: PublicVariant[] = active.map((v) => {
    const threshold = v.lowStockThreshold ?? productLow;
    const low = v.stock > 0 && v.stock <= threshold;
    return clean({
      id: String(v._id),
      sku: v.sku ?? '',
      colour: v.colour?.name || undefined,
      colourHex: v.colour?.hex || undefined,
      size: v.size || undefined,
      priceMinor: hidden ? 0 : v.sellingPriceMinor,
      mrpMinor: hidden ? undefined : v.mrpMinor > v.sellingPriceMinor ? v.mrpMinor : undefined,
      inStock: v.stock > 0,
      stockLeft: low ? v.stock : undefined,
      imageUrl: v.imageUrl,
    }) as PublicVariant;
  });

  // price summary
  let selling: number | undefined;
  let maxSelling: number | undefined;
  let mrp: number | undefined;
  if (!hidden) {
    if (active.length) {
      const sorted = [...active].sort((a, b) => a.sellingPriceMinor - b.sellingPriceMinor);
      selling = sorted[0].sellingPriceMinor;
      maxSelling = sorted[sorted.length - 1].sellingPriceMinor;
      mrp = sorted[0].mrpMinor || undefined;
    } else {
      selling = p.pricing?.minSellingMinor;
      maxSelling = p.pricing?.maxSellingMinor;
      mrp = p.pricing?.mrpMinor || undefined;
    }
    if (mrp !== undefined && selling !== undefined && mrp <= selling) mrp = undefined;
  }
  const discountPercent = mrp && selling !== undefined ? Math.round(((mrp - selling) / mrp) * 100) : undefined;

  // colours / sizes
  const colourMap = new Map<string, { name: string; hex?: string }>();
  for (const v of active) {
    const name = v.colour?.name;
    if (name && !colourMap.has(name)) colourMap.set(name, clean({ name, hex: v.colour?.hex || undefined }));
  }
  if (colourMap.size === 0) for (const name of p.colours ?? []) colourMap.set(name, { name });
  const sizeSet = new Set<string>();
  for (const v of active) if (v.size) sizeSet.add(v.size);
  if (sizeSet.size === 0) for (const s of p.sizes ?? []) sizeSet.add(s);
  const sizes = [...sizeSet].sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b));

  // stock
  const totalStock = active.length ? active.reduce((n, v) => n + v.stock, 0) : p.stockTotal;
  const inStock = totalStock > 0;
  const lowStock = inStock && totalStock <= productLow;

  const media: PublicMedia[] = [...(p.media ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, ctx.maxMedia ?? 50)
    .map((m) => clean({ id: String(m.mediaId), kind: m.kind, url: m.url, thumbUrl: m.thumbUrl, isPrimary: m.isPrimary || undefined }) as PublicMedia);

  const catId = p.categoryId ? String(p.categoryId) : undefined;
  const category = catId ? ctx.categories.get(catId) : undefined;
  const s = p.sareeAttrs;
  const g = p.garmentAttrs;
  const fabric = p.fabric ?? s?.fabric;

  const dto: PublicProduct = clean({
    id,
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    description: p.description ?? p.shortDescription,
    type: p.type,
    brand: p.brand,
    gender: p.gender,
    fabric,
    occasion: p.occasions?.length ? [...p.occasions] : undefined,
    tags: p.tags?.length ? [...p.tags] : undefined,
    category,
    media,
    primaryImageUrl: p.primaryImageUrl ?? media.find((m) => m.kind === 'IMAGE')?.url,
    primaryThumbUrl: p.primaryThumbUrl ?? media.find((m) => m.kind === 'IMAGE')?.thumbUrl,
    price: clean({ sellingMinor: selling, maxSellingMinor: maxSelling, mrpMinor: mrp, discountPercent, hidden }) as PublicProduct['price'],
    colours: [...colourMap.values()],
    sizes,
    variants,
    inStock,
    lowStock,
    offerBadge: findOfferBadge(ctx.offers, id, catId),
    sareeAttrs:
      p.type === 'SAREE' && s
        ? clean({
            sareeType: s.sareeType,
            length: s.lengthMeters ? `${s.lengthMeters} m` : undefined,
            blouseIncluded: s.blouseIncluded,
            blouseLength: s.blouseDescription,
            workTypes: s.workTypes?.length ? [...s.workTypes] : undefined,
            borderType: s.border,
            washCare: s.careInstructions,
          })
        : undefined,
    garmentAttrs:
      p.type === 'GARMENT' && g ? clean({ fit: g.fit, sleeveType: g.sleeveType, neckType: g.neckType, pattern: g.pattern, washCare: g.washCare }) : undefined,
    seo: {
      title: p.seo?.title || p.name,
      description: p.seo?.description || truncate(p.shortDescription ?? p.description, 160),
    },
    createdAt: new Date(p.createdAt).toISOString(),
  }) as PublicProduct;
  return dto;
}

// ------------------------------------------------------------------ shop / category / catalogue / offer
export function toPublicShop(s: IShop): PublicShop {
  return clean({
    id: String(s._id),
    slug: s.slug,
    name: s.name,
    description: s.description ?? s.tagline,
    businessType: s.businessType,
    logoUrl: s.logoUrl,
    coverUrl: s.coverUrl,
    address: clean({
      line1: s.address?.line1,
      line2: s.address?.line2,
      city: s.address?.city,
      state: s.address?.state,
      country: s.address?.country,
      pincode: s.address?.pincode,
    }),
    phone: s.contact?.phone,
    whatsapp: s.contact?.whatsapp,
    email: s.contact?.email,
    instagram: s.socials?.instagram,
    facebook: s.socials?.facebook,
    businessHours: (s.businessHours ?? []).map((h) =>
      clean({ day: h.day, open: !h.closed, openTime: h.closed ? undefined : h.open, closeTime: h.closed ? undefined : h.close }),
    ),
    currency: s.currency,
    theme: clean({
      templateId: s.theme.templateId,
      primaryColor: s.theme.primaryColor,
      buttonStyle: s.theme.buttonStyle,
      catalogueLayout: s.theme.catalogueLayout,
    }),
    payment: {
      codEnabled: s.paymentSettings.codEnabled,
      onlineEnabled: s.paymentSettings.onlineEnabled,
      payAtShopEnabled: s.paymentSettings.payAtShopEnabled,
    },
    seo: clean({ title: s.seo?.title, description: s.seo?.description, ogImageUrl: s.seo?.ogImageUrl }),
    whatsappEnabled: Boolean(s.contact?.whatsapp),
  }) as PublicShop;
}

export function toPublicCategory(c: Pick<ICategory, 'name' | 'slug' | 'imageUrl' | 'parentId'> & { _id: unknown }, productCount?: number): PublicCategory {
  return clean({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    parentId: c.parentId ? String(c.parentId) : null,
    productCount,
  }) as PublicCategory;
}

export function toPublicCatalogue(c: ICatalogue, productCount: number, coverFallback?: string): PublicCatalogue {
  return clean({
    id: String(c._id),
    slug: c.slug,
    name: c.name,
    description: c.description,
    coverUrl: c.coverUrl ?? coverFallback,
    productCount,
    startDate: c.startDate?.toISOString(),
    endDate: c.endDate?.toISOString(),
  }) as PublicCatalogue;
}

export function toPublicOffer(o: IOffer): PublicOffer {
  // TODO(offer-coupon): public coupon codes are not exposed (Coupons are private by design).
  return clean({
    id: String(o._id),
    name: o.name,
    description: o.description,
    discountType: o.discountType,
    discountValue: o.value,
    minOrderMinor: o.minOrderMinor || undefined,
    endDate: o.endsAt ? new Date(o.endsAt).toISOString() : undefined,
  }) as PublicOffer;
}
