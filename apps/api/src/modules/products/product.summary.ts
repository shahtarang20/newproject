import { STANDARD_SIZES } from '@vastra/shared';
import { invalidateShopCache } from '@/common/utils/cache';
import { Product, type IProduct } from '@/database/models/product.model';
import { ProductVariant } from '@/database/models/product-variant.model';
import { oid, type Id } from './product.utils';

export interface ProductSummary {
  pricing: Pick<IProduct['pricing'], 'minSellingMinor' | 'maxSellingMinor' | 'mrpMinor' | 'discountPercent'>;
  colours: string[];
  sizes: string[];
  stockTotal: number;
  status: IProduct['status'];
}

const sizeRank = (s: string): number => {
  const i = (STANDARD_SIZES as readonly string[]).indexOf(s.toUpperCase());
  return i === -1 ? 1000 : i;
};

/**
 * Re-derives the denormalised summary (price range, MRP, discount, colours, sizes, stockTotal) from ACTIVE variants
 * and auto-flips ACTIVE ↔ OUT_OF_STOCK when total stock hits 0 / returns. DRAFT and ARCHIVED are never touched.
 * Call after ANY variant or stock write (orders / inventory modules included). Returns null if the product is gone.
 */
export async function recomputeProductSummary(productId: Id, shopId: Id): Promise<ProductSummary | null> {
  const pid = oid(productId);
  const sid = oid(shopId);
  const [product, variants] = await Promise.all([
    Product.findOne({ _id: pid, shopId: sid }).select('status').lean(),
    ProductVariant.find({ productId: pid, shopId: sid, isActive: true }).select('sellingPriceMinor mrpMinor stock colour size').lean(),
  ]);
  if (!product) return null;

  const prices = variants.map((v) => v.sellingPriceMinor);
  const discounts = variants.map((v) => (v.mrpMinor > v.sellingPriceMinor ? Math.round(((v.mrpMinor - v.sellingPriceMinor) / v.mrpMinor) * 100) : 0));
  const stockTotal = variants.reduce((n, v) => n + Math.max(0, v.stock), 0);
  const colours = [...new Set(variants.map((v) => v.colour?.name?.trim()).filter((c): c is string => Boolean(c)))];
  const sizes = [...new Set(variants.map((v) => v.size?.trim()).filter((s): s is string => Boolean(s)))].sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b));

  const summary: ProductSummary = {
    pricing: {
      minSellingMinor: prices.length ? Math.min(...prices) : 0,
      maxSellingMinor: prices.length ? Math.max(...prices) : 0,
      mrpMinor: variants.length ? Math.max(...variants.map((v) => v.mrpMinor)) : 0,
      discountPercent: discounts.length ? Math.max(...discounts) : 0,
    },
    colours,
    sizes,
    stockTotal,
    status: product.status,
  };

  await Product.updateOne(
    { _id: pid, shopId: sid },
    {
      $set: {
        'pricing.minSellingMinor': summary.pricing.minSellingMinor,
        'pricing.maxSellingMinor': summary.pricing.maxSellingMinor,
        'pricing.mrpMinor': summary.pricing.mrpMinor,
        'pricing.discountPercent': summary.pricing.discountPercent,
        colours,
        sizes,
        stockTotal,
      },
    },
  );

  // Conditional flips keep this race-safe and never touch DRAFT / ARCHIVED.
  if (variants.length > 0 && stockTotal === 0) {
    const r = await Product.updateOne({ _id: pid, shopId: sid, status: 'ACTIVE' }, { $set: { status: 'OUT_OF_STOCK' } });
    if (r.modifiedCount) summary.status = 'OUT_OF_STOCK';
  } else if (stockTotal > 0) {
    const r = await Product.updateOne({ _id: pid, shopId: sid, status: 'OUT_OF_STOCK' }, { $set: { status: 'ACTIVE' } });
    if (r.modifiedCount) summary.status = 'ACTIVE';
  }
  invalidateShopCache(String(sid));
  return summary;
}
