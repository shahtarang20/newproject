import { asyncHandler } from '@/common/asyncHandler';
import { Errors } from '@/common/errors';
import { ok } from '@/common/response';
import { priceCart } from './cart.service';
import type { PriceCartInput } from './cart.schemas';

/** Requires req.shop (set by resolveShopBySlug). */
export const price = asyncHandler(async (req, res) => {
  if (!req.shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  ok(res, await priceCart(req.shop.id, req.body as PriceCartInput), 'Cart priced');
});
