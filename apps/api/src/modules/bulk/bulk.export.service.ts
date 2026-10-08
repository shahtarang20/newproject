import type { Response } from 'express';
import { Types } from 'mongoose';
import { Category, Product, ProductVariant, type IProduct } from '@/database/models';
import { csvHeaderLine, toCsvLine } from './bulk.csv';

const BATCH = 200;
type ProductRow = Pick<IProduct, '_id' | 'name' | 'sku' | 'categoryId' | 'description' | 'gender' | 'fabric' | 'brand' | 'type' | 'status' | 'pricing'>;
const major = (minor?: number): string => (minor === undefined ? '' : (minor / 100).toFixed(2));

/** Streams all (non-deleted) products × variants as CSV in the import format, in id-ordered batches. */
export async function streamExport(shopId: Types.ObjectId, res: Response): Promise<number> {
  const cats = await Category.find({ shopId }).select('name').lean();
  const catName = new Map(cats.map((c) => [String(c._id), c.name]));

  res.write(csvHeaderLine());
  let rows = 0;
  let lastId: Types.ObjectId | null = null;
  for (;;) {
    const products: ProductRow[] = await Product.find({ shopId, deletedAt: null, ...(lastId ? { _id: { $gt: lastId } } : {}) })
      .sort({ _id: 1 })
      .limit(BATCH)
      .select('name sku categoryId description gender fabric brand type status pricing')
      .lean<ProductRow[]>();
    if (!products.length) break;
    lastId = products[products.length - 1]._id;
    const variants = await ProductVariant.find({ shopId, productId: { $in: products.map((p) => p._id) } })
      .sort({ _id: 1 })
      .lean();
    const byProduct = new Map<string, typeof variants>();
    for (const v of variants) {
      const k = String(v.productId);
      byProduct.set(k, [...(byProduct.get(k) ?? []), v]);
    }
    let chunk = '';
    for (const p of products) {
      const common = [p.categoryId ? (catName.get(String(p.categoryId)) ?? '') : ''];
      const tail = [p.description ?? '', p.gender ?? '', p.fabric ?? '', p.brand ?? '', p.type, p.status];
      const vs = byProduct.get(String(p._id)) ?? [];
      if (!vs.length) {
        chunk += toCsvLine([p.name, p.sku ?? '', ...common, '', '', major(p.pricing?.minSellingMinor), major(p.pricing?.mrpMinor), 0, ...tail]);
        rows++;
        continue;
      }
      for (const v of vs) {
        chunk += toCsvLine([p.name, v.sku ?? '', ...common, v.colour?.name ?? '', v.size ?? '', major(v.sellingPriceMinor), major(v.mrpMinor), v.stock, ...tail]);
        rows++;
      }
    }
    if (!res.write(chunk)) await new Promise<void>((r) => res.once('drain', () => r()));
  }
  return rows;
}
