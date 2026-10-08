import { Router, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth } from '@/common/middleware/auth';
import { enquiryRateLimit, orderRateLimit, publicRateLimit } from '@/common/middleware/rateLimit';
import { antiSpam } from '@/common/middleware/security';
import { resolveShopBySlug } from '@/common/middleware/tenant';
import { validate } from '@/common/middleware/validate';
import { Errors, isAppError } from '@/common/errors';
import { env } from '@/config/env';
import { createEnquirySchema } from '@/modules/enquiries/enquiries.schemas';
import { placeOrderSchema, trackOrderSchema } from '@/modules/orders/orders.schemas';
import * as c from './storefront.controller';
import {
  cartPriceSchema,
  catalogueSlugParams,
  eventSchema,
  productSlugParams,
  productsQuerySchema,
  slugParams,
  verifyPaymentSchema,
} from './storefront.schemas';

/** Resolves the tenant from :slug. Suspended shops are reported as SHOP_NOT_FOUND (404) on the public site. */
const shopFromSlug: RequestHandler = (req, res, next) =>
  resolveShopBySlug(req, res, (err?: unknown) =>
    isAppError(err) && err.code === 'SHOP_SUSPENDED' ? next(Errors.notFound('SHOP_NOT_FOUND', 'Shop not found')) : next(err),
  );

const generous = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } });
    },
  });
const eventsRateLimit = generous(60_000, 600);
const trackRateLimit = generous(15 * 60_000, 30);

const shop = Router({ mergeParams: true });
shop.use(validate({ params: slugParams }));
shop.use(shopFromSlug);

// analytics ingest first: has its own (more generous) limiter instead of publicRateLimit
shop.post('/events', eventsRateLimit, validate({ body: eventSchema }), c.event);

shop.use(publicRateLimit);

shop.get('/', c.getShop);
shop.get('/categories', c.categories);
shop.get('/products', validate({ query: productsQuerySchema }), c.products);
shop.get('/products/:productSlug', validate({ params: productSlugParams }), c.product);
shop.get('/products/:productSlug/related', validate({ params: productSlugParams }), c.related);
shop.get('/facets', c.facets);
shop.get('/catalogues', c.catalogues);
shop.get('/catalogues/:catalogueSlug', validate({ params: catalogueSlugParams }), c.catalogue);
shop.get('/offers', c.offers);
shop.get('/sitemap-data', c.sitemapData);

shop.post('/cart/price', validate({ body: cartPriceSchema }), c.priceCartHandler);
shop.post('/orders', orderRateLimit, optionalAuth, ...antiSpam, validate({ body: placeOrderSchema }), c.placeOrder);
shop.post('/orders/track', trackRateLimit, validate({ body: trackOrderSchema }), c.track);
shop.post('/enquiries', enquiryRateLimit, ...antiSpam, validate({ body: createEnquirySchema }), c.enquiry);
shop.post('/payments/verify', validate({ body: verifyPaymentSchema }), c.verifyPayment);

const router = Router();
router.use('/:slug', shop);

export default router;
