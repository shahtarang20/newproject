import type { Types } from 'mongoose';
import type { ICatalogue } from '@/database/models/catalogue.model';
import type { ICoupon } from '@/database/models/coupon.model';
import type { IOffer } from '@/database/models/offer.model';
import { DAY_MS, type Rng } from '../prng';
import type { ShopContext } from '../types';
import { newId, rp } from '../util';
import type { CatalogPlan } from './catalog';

/** Ordered, published catalogues whose product lists come from each CatalogueDef.pick predicate. */
export function planCatalogues(ctx: ShopContext, catalog: CatalogPlan, rng: Rng, now: Date): ICatalogue[] {
  const sellable = catalog.built.map((b, index) => ({ b, index })).filter(({ b }) => b.product.status !== 'DRAFT');
  return ctx.def.catalogues.map((def, i) => {
    let chosen = sellable.filter(({ b, index }) => def.pick(b.spec, index));
    if (chosen.length < 4) chosen = [...chosen, ...sellable.filter((s) => !chosen.includes(s))].slice(0, 6);
    chosen = chosen.slice(0, def.limit);
    const createdAt = new Date(now.getTime() - (40 - i * 8) * DAY_MS);
    const categoryIds: Types.ObjectId[] = [];
    for (const { b } of chosen) if (b.product.categoryId && !categoryIds.some((c) => String(c) === String(b.product.categoryId))) categoryIds.push(b.product.categoryId);
    return {
      _id: newId(), shopId: ctx.shopId, name: def.name, slug: def.slug, description: def.description, coverUrl: chosen[0]?.b.product.primaryImageUrl,
      isPublic: true, isActive: true, sortOrder: i, categoryIds, layout: def.layout,
      products: chosen.map(({ b }, n) => ({ productId: b.product._id, sortOrder: n })), viewCount: rng.int(60, 640), createdAt, updatedAt: createdAt,
    };
  });
}

export interface OfferPlan { offers: IOffer[]; coupon: ICoupon }

/** 2 offers (storewide percent + targeted flat) and 1 coupon per shop. */
export function planOffers(ctx: ShopContext, catalog: CatalogPlan, now: Date): OfferPlan {
  const base = { shopId: ctx.shopId, isActive: true, productIds: [] as Types.ObjectId[], categoryIds: [] as Types.ObjectId[], maxDiscountMinor: null };
  const targetCat = catalog.categoryIdBySlug.get(ctx.def.offerCategorySlug);
  const t = (days: number): Date => new Date(now.getTime() + days * DAY_MS);
  const offers: IOffer[] = [
    { ...base, _id: newId(), name: 'Festive Season 10% Off', description: 'Flat 10% off on everything this festive season.', discountType: 'PERCENT', value: 10, scope: 'ALL', minOrderMinor: 0, startsAt: t(-45), endsAt: t(30), createdAt: t(-45), updatedAt: t(-45) },
    {
      ...base, _id: newId(), name: 'Flat Rs 300 Off', description: 'Rs 300 off on selected collection above Rs 2,999.', discountType: 'FLAT', value: rp(300),
      scope: 'CATEGORIES', categoryIds: targetCat ? [targetCat] : [], minOrderMinor: rp(2999), startsAt: t(-10), endsAt: t(20), createdAt: t(-10), updatedAt: t(-10),
    },
  ];
  const coupon: ICoupon = {
    _id: newId(), shopId: ctx.shopId, code: 'WELCOME10', description: '10% off your order above Rs 1,499 (max Rs 500).', discountType: 'PERCENT', value: 10,
    maxDiscountMinor: rp(500), minOrderMinor: rp(1499), usageLimit: 500, perCustomerLimit: null, usedCount: 0, startsAt: t(-60), endsAt: t(60), isActive: true,
    createdAt: t(-60), updatedAt: t(-60),
  };
  return { offers, coupon };
}
