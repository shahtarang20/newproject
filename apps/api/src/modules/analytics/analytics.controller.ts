import { asyncHandler } from '@/common/asyncHandler';
import { ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import { assertFeature } from '@/modules/subscriptions/limits.service';
import * as svc from './analytics.service';
import type { DashboardQuery, ProductsQuery, RangeQuery, SalesQuery } from './analytics.schemas';

const shopId = (req: Parameters<typeof tenantFilter>[0]): string => String(tenantFilter(req).shopId);

export const dashboard = asyncHandler(async (req, res) => {
  ok(res, await svc.getDashboard(shopId(req), (req.query as unknown as DashboardQuery).range));
});

export const sales = asyncHandler(async (req, res) => {
  const id = shopId(req);
  await assertFeature(id, 'analytics');
  ok(res, await svc.getSales(id, req.query as unknown as SalesQuery));
});

export const products = asyncHandler(async (req, res) => {
  const id = shopId(req);
  await assertFeature(id, 'analytics');
  await assertFeature(id, 'advancedAnalytics');
  const { items, meta, from, to } = await svc.getProductsAnalytics(id, req.query as unknown as ProductsQuery);
  ok(res, { items, from, to }, 'Success', meta);
});

export const funnel = asyncHandler(async (req, res) => {
  const id = shopId(req);
  await assertFeature(id, 'analytics');
  await assertFeature(id, 'advancedAnalytics');
  ok(res, await svc.getFunnel(id, req.query as unknown as RangeQuery));
});
