import type { Request, Response } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { audit } from '@/common/audit';
import { ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import { getPublicShopBySlug } from '@/modules/storefront/storefront.service';
import * as svc from './shops.service';
import { TEMPLATE_LIST } from './shops.templates';

const shopId = (req: Request): string => String(tenantFilter(req).shopId);

export const get = asyncHandler(async (req: Request, res: Response) => ok(res, await svc.getShopProfile(shopId(req))));

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { shop, slugChanged, before, after } = await svc.updateShop(shopId(req), req.body);
  await audit(req, { action: slugChanged ? 'shop.slug_changed' : 'shop.updated', entity: 'Shop', entityId: shopId(req), before, after });
  return ok(res, shop, 'Shop updated');
});

export const logo = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.uploadShopImage(shopId(req), req.file, 'logo');
  await audit(req, { action: 'shop.logo_updated', entity: 'Shop', entityId: shopId(req) });
  return ok(res, data, 'Logo updated');
});

export const cover = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.uploadShopImage(shopId(req), req.file, 'cover');
  await audit(req, { action: 'shop.cover_updated', entity: 'Shop', entityId: shopId(req) });
  return ok(res, data, 'Cover updated');
});

export const usage = asyncHandler(async (req: Request, res: Response) => ok(res, await svc.getShopUsage(shopId(req))));

export const templates = asyncHandler(async (_req: Request, res: Response) => ok(res, TEMPLATE_LIST));

export const publicShop = asyncHandler(async (req: Request, res: Response) => ok(res, await getPublicShopBySlug(String(req.params.slug))));
