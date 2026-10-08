import { Types, type FilterQuery } from 'mongoose';
import { Errors } from '@/common/errors';
import { Product, ProductVariant, type IProduct } from '@/database/models';
import { recomputeProductSummary } from '@/modules/products/products.service';
import { adjustVariantStock, type StockChangeOutcome } from './bulk.inventory';
import type { PriceBody, StatusBody, StockBody } from './bulk.schemas';
import { mapLimit } from './bulk.util';

const MAX_FILTER_PRODUCTS = 5000;

const recompute = (shopId: Types.ObjectId, ids: Array<Types.ObjectId | string>): Promise<unknown> =>
  mapLimit([...new Set(ids.map(String))], 8, (id) => recomputeProductSummary(id, String(shopId)));

async function resolveProductIds(shopId: Types.ObjectId, b: Pick<PriceBody, 'productIds' | 'filter'>): Promise<Types.ObjectId[]> {
  const f: FilterQuery<IProduct> = { shopId, deletedAt: null };
  if (b.productIds) f._id = { $in: b.productIds.map((i) => new Types.ObjectId(i)) };
  else if (b.filter) {
    if (b.filter.categoryId) f.categoryId = new Types.ObjectId(b.filter.categoryId);
    if (b.filter.status) f.status = b.filter.status;
    if (b.filter.type) f.type = b.filter.type;
  }
  const docs = await Product.find(f).select('_id').limit(MAX_FILTER_PRODUCTS + 1).lean();
  if (docs.length > MAX_FILTER_PRODUCTS) throw Errors.badRequest('VALIDATION_ERROR', `Filter matches more than ${MAX_FILTER_PRODUCTS} products. Narrow it down.`);
  return docs.map((d) => d._id);
}

/** Aggregation expression computing the new value of `field` for the chosen mode (integer minor units, never negative). */
function priceExpr(field: string, mode: PriceBody['mode'], value: number): unknown {
  switch (mode) {
    case 'SET':
      return value;
    case 'INCREASE_FLAT':
      return { $add: [field, value] };
    case 'INCREASE_PERCENT':
      return { $round: [{ $multiply: [field, 1 + value / 100] }, 0] };
    case 'DECREASE_PERCENT':
      return { $max: [0, { $round: [{ $multiply: [field, 1 - value / 100] }, 0] }] };
  }
}

export async function bulkPrice(shopId: Types.ObjectId, b: PriceBody) {
  const productIds = await resolveProductIds(shopId, b);
  if (!productIds.length) return { productsMatched: 0, variantsUpdated: 0 };

  const set: Record<string, unknown> = {};
  const newSelling = priceExpr('$sellingPriceMinor', b.mode, b.value);
  const newMrp = priceExpr('$mrpMinor', b.mode, b.value);
  if (b.target === 'SELLING') {
    set.sellingPriceMinor = newSelling;
    // keep MRP >= selling price when MRP is set
    set.mrpMinor = { $cond: [{ $and: [{ $gt: ['$mrpMinor', 0] }, { $lt: ['$mrpMinor', newSelling] }] }, newSelling, '$mrpMinor'] };
  } else if (b.target === 'MRP') {
    set.mrpMinor = newMrp;
  } else {
    set.sellingPriceMinor = newSelling;
    set.mrpMinor = newMrp;
  }
  const res = await ProductVariant.updateMany({ shopId, productId: { $in: productIds } }, [{ $set: set }]);
  await recompute(shopId, productIds);
  return { productsMatched: productIds.length, variantsUpdated: res.modifiedCount };
}

export async function bulkStatus(shopId: Types.ObjectId, b: StatusBody) {
  const ids = b.productIds.map((i) => new Types.ObjectId(i));
  const res = await Product.updateMany({ shopId, deletedAt: null, _id: { $in: ids } }, { $set: { status: b.status } });
  await recompute(shopId, ids);
  return { requested: ids.length, matched: res.matchedCount, updated: res.modifiedCount };
}

export interface StockItemResult {
  index: number;
  ok: boolean;
  variantId?: string;
  sku?: string;
  before?: number;
  after?: number;
  delta?: number;
  error?: string;
}

/** Each item is applied independently through the inventory service; failures are reported per item (no silent overwrite). */
export async function bulkStock(shopId: Types.ObjectId, userId: string | undefined, b: StockBody, ip?: string) {
  const results = await mapLimit(b.items, 5, async (item, ): Promise<StockItemResult> => {
    const index = b.items.indexOf(item);
    try {
      const o: StockChangeOutcome = await adjustVariantStock(shopId, userId, item, ip);
      return { index, ok: true, variantId: o.variantId, sku: o.sku, before: o.before, after: o.after, delta: o.delta };
    } catch (err) {
      return { index, ok: false, variantId: item.variantId, sku: item.sku, error: (err as Error).message };
    }
  });
  return {
    total: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}
