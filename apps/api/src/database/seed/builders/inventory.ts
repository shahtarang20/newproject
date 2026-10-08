import type { IInventoryTransaction } from '@/database/models/inventory-transaction.model';
import { DAY_MS, type Rng } from '../prng';
import type { BuiltProduct, ShopContext } from '../types';
import { idStr, newId } from '../util';
import { applySummary } from './catalog';
import type { StockEvent } from './orders';

/**
 * Builds the full ledger so that, per variant, opening PURCHASE + SALE/RETURN/DAMAGE = current ProductVariant.stock,
 * and every balanceAfter is non-negative and chronological.
 */
export function planInventory(ctx: ShopContext, built: BuiltProduct[], orderEvents: StockEvent[], rng: Rng, now: Date): IInventoryTransaction[] {
  const events = [...orderEvents];
  // A few damaged pieces for realism (only on variants with plenty of stock).
  for (const b of built) {
    for (const v of b.variants) {
      if (v.stock >= 15 && rng.chance(0.04)) {
        events.push({ variantId: v._id, productId: b.product._id, type: 'DAMAGE', quantity: -1, at: new Date(now.getTime() - rng.int(3, 40) * DAY_MS), reason: 'Damaged in storage' });
      }
    }
  }
  const byVariant = new Map<string, StockEvent[]>();
  for (const e of events) {
    const k = idStr(e.variantId);
    byVariant.set(k, [...(byVariant.get(k) ?? []), e]);
  }

  const txns: IInventoryTransaction[] = [];
  const touched = new Set<BuiltProduct>();
  for (const b of built) {
    for (const v of b.variants) {
      const evs = (byVariant.get(idStr(v._id)) ?? []).sort((a, c) => a.at.getTime() - c.at.getTime());
      let opening = v.stock - evs.reduce((n, e) => n + e.quantity, 0);
      // Make sure the running balance never dips below zero (e.g. sale then cancel on a zero-stock variant).
      let run = opening;
      let min = run;
      for (const e of evs) { run += e.quantity; min = Math.min(min, run); }
      if (min < 0) { opening -= min; v.stock -= min; touched.add(b); }
      let balance = opening;
      if (opening > 0) {
        txns.push({
          _id: newId(), shopId: ctx.shopId, productId: b.product._id, variantId: v._id, type: 'PURCHASE', quantity: opening, balanceAfter: opening,
          reason: 'Opening stock', unitCostMinor: v.costPriceMinor, createdBy: ctx.ownerId, createdAt: b.product.createdAt,
        });
      }
      for (const e of evs) {
        balance += e.quantity;
        txns.push({
          _id: newId(), shopId: ctx.shopId, productId: e.productId, variantId: e.variantId, type: e.type, quantity: e.quantity, balanceAfter: balance,
          reason: e.reason, ...(e.orderId ? { orderId: e.orderId } : {}), createdBy: ctx.ownerId, createdAt: e.at,
        });
      }
    }
  }
  for (const b of touched) applySummary(b.product, b.variants);
  return txns;
}
