import { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { ProductVariant } from '@/database/models';
import { adjustStock } from '@/modules/inventory/inventory.service';

export interface StockChangeInput {
  variantId?: string;
  sku?: string;
  mode: 'SET' | 'ADD';
  quantity: number;
  reason?: string;
}

export interface StockChangeOutcome {
  variantId: string;
  productId: string;
  sku?: string;
  before: number;
  after: number;
  delta: number;
  transactionId?: string;
}

/**
 * Applies a stock change ONLY through the inventory service (atomic conditional $inc + InventoryTransaction ADJUSTMENT,
 * product summary recompute, low-stock notifications). SET is converted to a signed delta against the current stock.
 */
export async function adjustVariantStock(
  shopId: string | Types.ObjectId,
  userId: string | undefined,
  input: StockChangeInput,
  ip?: string,
): Promise<StockChangeOutcome> {
  const sid = new Types.ObjectId(String(shopId));
  const filter = input.variantId ? { shopId: sid, _id: input.variantId } : { shopId: sid, sku: input.sku };
  const v = await ProductVariant.findOne(filter).select('stock sku productId').lean();
  if (!v) throw Errors.notFound('INVALID_VARIANT', `Variant not found (${input.variantId ?? input.sku})`);
  const delta = input.mode === 'SET' ? input.quantity - v.stock : input.quantity;
  const base = { variantId: String(v._id), productId: String(v.productId), sku: v.sku, before: v.stock };
  if (delta === 0) return { ...base, after: v.stock, delta: 0 };
  const r = await adjustStock(
    String(sid),
    { variantId: String(v._id), type: 'ADJUSTMENT', quantity: delta, note: input.reason ?? `Bulk stock ${input.mode === 'SET' ? 'set' : 'add'}` },
    { userId, ip },
  );
  return { ...base, before: r.before, after: r.stock, delta: r.delta, transactionId: r.transactionId };
}
