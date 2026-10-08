import { Router } from 'express';
import { validate } from '@/common/middleware/validate';
import { resolveShopBySlug } from '@/common/middleware/tenant';
import * as c from './cart.controller';
import { priceCartSchema } from './cart.schemas';

/**
 * Public cart router. NOT mounted in modules/index.ts: the storefront router mounts it at
 * `/storefront/:slug/cart` (mergeParams) giving `POST /api/storefront/:slug/cart/price`.
 */
const router = Router({ mergeParams: true });
router.post('/price', resolveShopBySlug, validate({ body: priceCartSchema }), c.price);

export default router;
