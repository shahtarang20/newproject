import type { Request, Response } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { Errors } from '@/common/errors';
import { tenantFilter } from '@/common/tenant';
import * as svc from './qr.service';
import type { QrQuery } from './qr.schemas';

function send(res: Response, img: svc.QrImage, q: QrQuery): void {
  res.setHeader('Content-Type', img.contentType);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-QR-Url', encodeURI(img.url));
  if (q.download) res.setHeader('Content-Disposition', `attachment; filename="${img.filename}"`);
  res.status(200).send(img.body);
}

const slugOf = (req: Request): string => {
  if (!req.shop) throw Errors.forbidden('Shop context required', 'SHOP_NOT_FOUND');
  return req.shop.slug;
};

export const shop = asyncHandler(async (req, res) => {
  const q = req.query as unknown as QrQuery;
  const slug = slugOf(req);
  send(res, await svc.render(svc.shopUrl(slug), q.format, q.size, `shop-${slug}`), q);
});

export const catalogue = asyncHandler(async (req, res) => {
  const q = req.query as unknown as QrQuery;
  const { url, name } = await svc.catalogueUrl(tenantFilter(req).shopId, slugOf(req), String(req.params.id));
  send(res, await svc.render(url, q.format, q.size, name), q);
});

export const product = asyncHandler(async (req, res) => {
  const q = req.query as unknown as QrQuery;
  const { url, name } = await svc.productUrl(tenantFilter(req).shopId, slugOf(req), String(req.params.id));
  send(res, await svc.render(url, q.format, q.size, name), q);
});
