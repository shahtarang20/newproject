import { Types, type ClientSession } from 'mongoose';
import type { InventoryTxnType } from '@vastra/shared';
import { Errors } from '@/common/errors';
import { audit } from '@/common/audit';
import { logger } from '@/config/logger';
import { InventoryTransaction, type IInventoryTransaction } from '@/database/models/inventory-transaction.model';
import { Product } from '@/database/models/product.model';
import { ProductVariant, type IProductVariant } from '@/database/models/product-variant.model';
import { Shop } from '@/database/models/shop.model';
import { notify } from '@/providers/notifications/notify.service';
import { recomputeProductSummary } from '@/modules/products/products.service';
import { runAtomic } from './transaction';

const oid = (v: string | Types.ObjectId): Types.ObjectId => (typeof v === 'string' ? new Types.ObjectId(v) : v);

export interface RecordTransactionInput {
  shopId: string | Types.ObjectId;
  productId: string | Types.ObjectId;
  variantId: string | Types.ObjectId;
  type: InventoryTxnType;
  /** Signed delta applied to the variant stock. */
  quantity: number;
  balanceAfter: number;
  reason?: string;
  orderId?: string | Types.ObjectId;
  unitCostMinor?: number;
  createdBy?: string | Types.ObjectId;
}

export async function recordTransaction(input: RecordTransactionInput, session?: ClientSession): Promise<IInventoryTransaction> {
  const [doc] = await InventoryTransaction.create(
    [
      {
        shopId: oid(input.shopId),
        productId: oid(input.productId),
        variantId: oid(input.variantId),
        type: input.type,
        quantity: input.quantity,
        balanceAfter: input.balanceAfter,
        reason: input.reason,
        orderId: input.orderId ? oid(input.orderId) : undefined,
        unitCostMinor: input.unitCostMinor,
        createdBy: input.createdBy ? oid(input.createdBy) : undefined,
      },
    ],
    { session },
  );
  return doc;
}

/**
 * Atomic conditional decrement: succeeds only when the variant is active, belongs to the shop and has `stock >= qty`.
 * Returns the variant AFTER the update, or null when it could not be decremented.
 */
export async function decrementStock(
  shopId: string | Types.ObjectId,
  variantId: string | Types.ObjectId,
  qty: number,
  session?: ClientSession,
): Promise<IProductVariant | null> {
  return ProductVariant.findOneAndUpdate(
    { _id: oid(variantId), shopId: oid(shopId), isActive: true, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { new: true, session },
  ).lean<IProductVariant>();
}

/** Atomic increment (no active check — returned stock must always be restorable). Null when the variant no longer exists. */
export async function incrementStock(
  shopId: string | Types.ObjectId,
  variantId: string | Types.ObjectId,
  qty: number,
  session?: ClientSession,
): Promise<IProductVariant | null> {
  return ProductVariant.findOneAndUpdate({ _id: oid(variantId), shopId: oid(shopId) }, { $inc: { stock: qty } }, { new: true, session }).lean<IProductVariant>();
}

export interface StockChange {
  variantId: string;
  productId: string;
  before: number;
  after: number;
  variantThreshold?: number;
}

/** Sends LOW_STOCK / OUT_OF_STOCK notifications when `change` crossed a threshold downwards. Never throws. */
export async function notifyStockCrossings(shopId: string, changes: StockChange[]): Promise<void> {
  try {
    const falling = changes.filter((c) => c.after < c.before);
    if (!falling.length) return;
    const shop = await Shop.findById(shopId).select('notificationSettings').lean();
    const shopThreshold = shop?.notificationSettings?.lowStockThreshold ?? 5;
    const products = await Product.find({ _id: { $in: [...new Set(falling.map((c) => c.productId))] }, shopId })
      .select('name lowStockThreshold')
      .lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const variants = await ProductVariant.find({ _id: { $in: falling.map((c) => c.variantId) }, shopId })
      .select('sku size colour')
      .lean();
    const vById = new Map(variants.map((v) => [String(v._id), v]));

    for (const c of falling) {
      const p = byId.get(c.productId);
      const v = vById.get(c.variantId);
      const threshold = c.variantThreshold ?? p?.lowStockThreshold ?? shopThreshold;
      const label = [p?.name ?? 'Product', v?.colour?.name, v?.size].filter(Boolean).join(' / ');
      const data = { productId: c.productId, variantId: c.variantId, sku: v?.sku, stock: c.after };
      if (c.after <= 0 && c.before > 0) {
        await notify({ shopId, type: 'OUT_OF_STOCK', title: `Out of stock: ${label}`, body: `${label} is now out of stock.`, data, channels: ['IN_APP', 'EMAIL', 'WHATSAPP'] });
      } else if (c.after > 0 && c.after <= threshold && c.before > threshold) {
        await notify({
          shopId,
          type: 'LOW_STOCK',
          title: `Low stock: ${label}`,
          body: `Only ${c.after} left of ${label} (threshold ${threshold}).`,
          data,
          channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        });
      }
    }
  } catch (err) {
    logger.warn({ err }, 'stock notification failed');
  }
}

/** Recomputes denormalised product summaries; failures are logged, never thrown. */
export async function recomputeProducts(shopId: string, productIds: string[]): Promise<void> {
  const results = await Promise.allSettled([...new Set(productIds)].map((id) => recomputeProductSummary(id, shopId)));
  for (const r of results) if (r.status === 'rejected') logger.warn({ err: r.reason }, 'recomputeProductSummary failed');
}

export type AdjustType = Extract<InventoryTxnType, 'PURCHASE' | 'ADJUSTMENT' | 'DAMAGE' | 'RETURN'>;

export interface AdjustStockInput {
  variantId: string;
  type: AdjustType;
  /**
   * PURCHASE / RETURN: positive integer, stock increases.
   * DAMAGE: positive integer, stock decreases.
   * ADJUSTMENT: signed non-zero integer delta (positive adds, negative removes).
   */
  quantity: number;
  note?: string;
  unitCostMinor?: number;
}

/** Signed stock delta for a manual adjustment (see AdjustStockInput.quantity). */
export function signedDelta(type: AdjustType, quantity: number): number {
  switch (type) {
    case 'PURCHASE':
    case 'RETURN':
      return Math.abs(quantity);
    case 'DAMAGE':
      return -Math.abs(quantity);
    default:
      return quantity;
  }
}

export interface AdjustStockResult {
  variantId: string;
  productId: string;
  type: AdjustType;
  delta: number;
  before: number;
  stock: number;
  transactionId: string;
}

/** Atomic manual stock change. Stock never goes below zero (INSUFFICIENT_STOCK). */
export async function adjustStock(
  shopId: string,
  input: AdjustStockInput,
  actor: { userId?: string; ip?: string } = {},
): Promise<AdjustStockResult> {
  const delta = signedDelta(input.type, input.quantity);
  if (!Number.isInteger(delta) || delta === 0) throw Errors.badRequest('VALIDATION_ERROR', 'Quantity must be a non-zero integer');

  const result = await runAtomic(async ({ session, onRollback }) => {
    const filter: Record<string, unknown> = { _id: oid(input.variantId), shopId: oid(shopId) };
    if (delta < 0) filter.stock = { $gte: -delta };
    const after = await ProductVariant.findOneAndUpdate(filter, { $inc: { stock: delta } }, { new: true, session }).lean<IProductVariant>();
    if (!after) {
      const exists = await ProductVariant.exists({ _id: oid(input.variantId), shopId: oid(shopId) }).session(session ?? null);
      if (!exists) throw Errors.notFound('INVALID_VARIANT', 'Variant not found');
      throw Errors.conflict('INSUFFICIENT_STOCK', 'Not enough stock to remove that quantity');
    }
    onRollback(async () => {
      await ProductVariant.updateOne({ _id: after._id, shopId: oid(shopId) }, { $inc: { stock: -delta } });
    });
    const txn = await recordTransaction(
      {
        shopId,
        productId: after.productId,
        variantId: after._id,
        type: input.type,
        quantity: delta,
        balanceAfter: after.stock,
        reason: input.note,
        unitCostMinor: input.unitCostMinor,
        createdBy: actor.userId,
      },
      session,
    );
    return { after, txn };
  });

  const { after, txn } = result;
  const before = after.stock - delta;
  await recomputeProducts(shopId, [String(after.productId)]);
  void notifyStockCrossings(shopId, [
    { variantId: String(after._id), productId: String(after.productId), before, after: after.stock, variantThreshold: after.lowStockThreshold },
  ]);
  void audit(
    { userId: actor.userId, shopId, ip: actor.ip },
    { action: 'inventory.adjust', entity: 'ProductVariant', entityId: after._id, before: { stock: before }, after: { stock: after.stock }, meta: { type: input.type, delta, note: input.note } },
  );

  return {
    variantId: String(after._id),
    productId: String(after.productId),
    type: input.type,
    delta,
    before,
    stock: after.stock,
    transactionId: String(txn._id),
  };
}
