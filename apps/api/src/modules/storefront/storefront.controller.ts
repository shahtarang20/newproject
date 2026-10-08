import type { Request } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { created, noContent, ok } from '@/common/response';
import { Errors } from '@/common/errors';
import { logger } from '@/config/logger';
import { createEnquiry } from '@/modules/enquiries/enquiries.service';
import { placeGuestOrder, trackOrder } from '@/modules/orders/orders.service';
import { priceCart } from '@/modules/cart/cart.service';
import { verifyAndMarkPaid } from '@/modules/payments/payments.service';
import { recordEvent } from '@/modules/analytics/analytics.service';
import * as svc from './storefront.service';
import type { ProductsQuery } from './storefront.schemas';

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|monitor|curl|wget/i;
const isBot = (req: Request): boolean => BOT_UA.test(req.get('user-agent') ?? '');
const shopId = (req: Request): string => {
  if (!req.shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  return req.shop.id;
};

export const getShop = asyncHandler(async (req, res) => {
  ok(res, await svc.getPublicShopBySlug(req.params.slug));
});

export const categories = asyncHandler(async (req, res) => {
  ok(res, await svc.listCategories(shopId(req)));
});

export const products = asyncHandler(async (req, res) => {
  const r = await svc.listProducts(shopId(req), req.query as unknown as ProductsQuery);
  ok(res, r.data, 'Products', r.meta);
});

export const product = asyncHandler(async (req, res) => {
  const p = await svc.getProductBySlug(shopId(req), req.params.productSlug);
  if (!isBot(req)) svc.bumpProductView(shopId(req), p.id);
  ok(res, p);
});

export const related = asyncHandler(async (req, res) => {
  ok(res, await svc.getRelatedProducts(shopId(req), req.params.productSlug));
});

export const facets = asyncHandler(async (req, res) => {
  ok(res, await svc.getFacets(shopId(req)));
});

export const catalogues = asyncHandler(async (req, res) => {
  ok(res, await svc.listCatalogues(shopId(req)));
});

export const catalogue = asyncHandler(async (req, res) => {
  ok(res, await svc.getCatalogueBySlug(shopId(req), req.params.catalogueSlug));
});

export const offers = asyncHandler(async (req, res) => {
  ok(res, await svc.listOffers(shopId(req)));
});

export const sitemapData = asyncHandler(async (req, res) => {
  ok(res, await svc.getSitemapData(shopId(req)));
});

export const priceCartHandler = asyncHandler(async (req, res) => {
  ok(res, await priceCart(shopId(req), req.body));
});

export const placeOrder = asyncHandler(async (req, res) => {
  // Authenticated CUSTOMER accounts (optionalAuth) get the order linked to their account.
  const customerUserId = req.auth?.role === 'CUSTOMER' ? req.auth.userId : undefined;
  const result = await placeGuestOrder(shopId(req), req.body, { ip: req.ip, userAgent: req.get('user-agent') ?? undefined, customerUserId });
  created(res, result, 'Order placed');
});

export const track = asyncHandler(async (req, res) => {
  const b = req.body as { orderNumber: string; phone: string };
  ok(res, await trackOrder(shopId(req), b.orderNumber, b.phone));
});

export const enquiry = asyncHandler(async (req, res) => {
  created(res, await createEnquiry(shopId(req), req.body), 'Enquiry sent');
});

/** Analytics ingest: respond immediately, persist in the background. */
export const event = asyncHandler(async (req, res) => {
  noContent(res);
  if (isBot(req)) return;
  recordEvent(shopId(req), req.body).catch((err) => logger.warn({ err }, 'recordEvent failed'));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  ok(res, await verifyAndMarkPaid(shopId(req), req.body), 'Payment verified');
});
