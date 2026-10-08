import { asyncHandler } from '@/common/asyncHandler';
import { Errors } from '@/common/errors';
import { ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import * as inventory from './inventory.service';
import * as query from './inventory.query.service';
import type { AdjustStockBody, InventoryListQuery, TransactionsQuery } from './inventory.schemas';

const shopIdOf = (req: Parameters<typeof tenantFilter>[0]): string => String(tenantFilter(req).shopId);

export const list = asyncHandler(async (req, res) => {
  const { rows, summary, meta } = await query.listInventory(shopIdOf(req), req.query as unknown as InventoryListQuery);
  ok(res, { items: rows, summary }, 'Inventory', meta);
});

export const adjust = asyncHandler(async (req, res) => {
  if (!req.auth) throw Errors.unauthorized();
  const result = await inventory.adjustStock(shopIdOf(req), req.body as AdjustStockBody, { userId: req.auth.userId, ip: req.ip });
  ok(res, result, 'Stock updated');
});

export const transactions = asyncHandler(async (req, res) => {
  const { items, meta } = await query.listTransactions(shopIdOf(req), req.query as unknown as TransactionsQuery);
  ok(res, items, 'Inventory transactions', meta);
});
