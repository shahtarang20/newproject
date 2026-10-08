import type { RequestHandler } from 'express';
import { Shop } from '@/database/models/shop.model';
import { Errors } from '../errors';

/**
 * Resolves a PUBLIC shop from `:slug` (no auth) and sets req.shop.
 * Use on /storefront/:slug/* routers (mergeParams) — unknown → 404 SHOP_NOT_FOUND, suspended → 403 SHOP_SUSPENDED.
 */
export const resolveShopBySlug: RequestHandler = async (req, _res, next) => {
  try {
    const slug = String(req.params.slug ?? '').toLowerCase();
    if (!slug) return next(Errors.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    const shop = await Shop.findOne({ slug }).select('slug status').lean();
    if (!shop || shop.status === 'PENDING') return next(Errors.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    if (shop.status === 'SUSPENDED') return next(Errors.forbidden('This shop is currently unavailable', 'SHOP_SUSPENDED'));
    req.shop = { id: String(shop._id), slug: shop.slug, status: shop.status };
    return next();
  } catch (err) {
    return next(err);
  }
};
