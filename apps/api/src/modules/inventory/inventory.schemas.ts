import { z } from 'zod';
import { INVENTORY_TXN_TYPES } from '@vastra/shared';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const adjustStockSchema = z
  .object({
    variantId: objectId,
    type: z.enum(['PURCHASE', 'ADJUSTMENT', 'DAMAGE', 'RETURN']),
    quantity: z.number().int().min(-1_000_000).max(1_000_000),
    note: z.string().trim().max(500).optional(),
    unitCostMinor: z.number().int().min(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.quantity === 0) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Quantity cannot be zero' });
    else if (v.type !== 'ADJUSTMENT' && v.quantity < 0)
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: `${v.type} quantity must be positive (direction is implied by type)` });
  });

export const inventoryListQuery = z.object({
  filter: z.enum(['all', 'low', 'out']).default('all'),
  q: z.string().trim().max(100).optional(),
  productId: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const transactionsQuery = z.object({
  variantId: objectId.optional(),
  productId: objectId.optional(),
  type: z.enum(INVENTORY_TXN_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdjustStockBody = z.infer<typeof adjustStockSchema>;
export type InventoryListQuery = z.infer<typeof inventoryListQuery>;
export type TransactionsQuery = z.infer<typeof transactionsQuery>;
