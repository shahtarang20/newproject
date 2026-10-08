import type { Request, Response } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { audit } from '@/common/audit';
import { Errors } from '@/common/errors';
import { created, ok } from '@/common/response';
import { listAuditLogs } from '@/modules/audit/audit.service';
import * as analytics from './admin.analytics.service';
import * as plans from './admin.plans.service';
import * as settings from './admin.settings.service';
import * as shops from './admin.shops.service';
import * as users from './admin.users.service';

type Q = Record<string, unknown>;
const q = (req: Request): Q => req.query as Q;
const actorId = (req: Request): string => {
  if (!req.auth) throw Errors.unauthorized();
  return req.auth.userId;
};
/** Audit rows for admin actions are cross-tenant: attribute them to the target shop explicitly. */
const auditAdmin = (req: Request, shopId: string | undefined, entry: Parameters<typeof audit>[1]) =>
  audit({ userId: actorId(req), shopId, ip: req.ip }, entry);

// ---- shops
export const shopsList = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await shops.listShops(q(req));
  return ok(res, items, 'Success', meta);
});
export const shopGet = asyncHandler(async (req: Request, res: Response) => ok(res, await shops.getShopDetail(req.params.id)));
export const shopStatus = asyncHandler(async (req: Request, res: Response) => {
  const { before, after } = await shops.setShopStatus(req.params.id, req.body.status, req.body.reason);
  await auditAdmin(req, req.params.id, { action: req.body.status === 'SUSPENDED' ? 'admin.shop_suspended' : 'admin.shop_activated', entity: 'Shop', entityId: req.params.id, before, after });
  return ok(res, await shops.getShopDetail(req.params.id), 'Shop status updated');
});
export const shopLimits = asyncHandler(async (req: Request, res: Response) => {
  const { limitOverrides, before } = await shops.updateShopLimits(req.params.id, req.body);
  await auditAdmin(req, req.params.id, { action: 'admin.shop_limits_updated', entity: 'Subscription', entityId: req.params.id, before, after: limitOverrides });
  return ok(res, await shops.getShopDetail(req.params.id), 'Limit overrides updated');
});
export const shopPlan = asyncHandler(async (req: Request, res: Response) => {
  const { before, after, overLimit } = await shops.assignShopPlan(req.params.id, req.body);
  await auditAdmin(req, req.params.id, { action: 'admin.shop_plan_assigned', entity: 'Subscription', entityId: req.params.id, before, after });
  return ok(res, { ...(await shops.getShopDetail(req.params.id)), overLimit }, 'Plan assigned');
});

// ---- users
export const usersList = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await users.listUsers(q(req));
  return ok(res, items, 'Success', meta);
});
export const userGet = asyncHandler(async (req: Request, res: Response) => ok(res, await users.getUser(req.params.id)));
export const userUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { before, after, user } = await users.setUserActive(actorId(req), req.params.id, req.body.isActive);
  await auditAdmin(req, undefined, { action: after.isActive ? 'admin.user_activated' : 'admin.user_deactivated', entity: 'User', entityId: req.params.id, before, after });
  return ok(res, user, 'User updated');
});

// ---- plans
export const plansList = asyncHandler(async (req: Request, res: Response) => ok(res, await plans.listPlans((req.query as { includeInactive?: boolean }).includeInactive !== false)));
export const planGet = asyncHandler(async (req: Request, res: Response) => ok(res, await plans.getPlan(req.params.id)));
export const planCreate = asyncHandler(async (req: Request, res: Response) => {
  const { plan } = await plans.createPlan(req.body);
  await auditAdmin(req, undefined, { action: 'admin.plan_created', entity: 'SubscriptionPlan', entityId: plan.id, after: req.body });
  return created(res, plan, 'Plan created');
});
export const planUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { plan, before, after } = await plans.updatePlan(req.params.id, req.body);
  await auditAdmin(req, undefined, { action: 'admin.plan_updated', entity: 'SubscriptionPlan', entityId: req.params.id, before, after });
  return ok(res, plan, 'Plan updated');
});
export const planDelete = asyncHandler(async (req: Request, res: Response) => {
  const result = await plans.deactivatePlan(req.params.id);
  await auditAdmin(req, undefined, { action: 'admin.plan_deactivated', entity: 'SubscriptionPlan', entityId: req.params.id, meta: { shopCount: result.shopCount } });
  return ok(res, { deactivated: true, shopCount: result.shopCount }, 'Plan deactivated');
});

// ---- subscriptions
export const subsList = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await plans.listSubscriptions(q(req));
  return ok(res, items, 'Success', meta);
});
export const subUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { before, after } = await plans.updateSubscription(req.params.id, req.body);
  await auditAdmin(req, undefined, { action: 'admin.subscription_updated', entity: 'Subscription', entityId: req.params.id, before, after });
  return ok(res, after, 'Subscription updated');
});

// ---- analytics / storage / settings / logs
export const analyticsGet = asyncHandler(async (req: Request, res: Response) => ok(res, await analytics.platformAnalytics(q(req).days as number | undefined)));
export const storageGet = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta, totals, topConsumers } = await analytics.storageOverview(q(req));
  return ok(res, { items, totals, topConsumers }, 'Success', meta);
});
export const settingsGet = asyncHandler(async (_req: Request, res: Response) => ok(res, await settings.getSettings()));
export const settingsPut = asyncHandler(async (req: Request, res: Response) => {
  const { before, after } = await settings.updateSettings(actorId(req), req.body);
  await auditAdmin(req, undefined, { action: 'admin.settings_updated', entity: 'PlatformSetting', before, after });
  return ok(res, after, 'Settings saved');
});
export const logsList = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await listAuditLogs(q(req));
  return ok(res, items, 'Success', meta);
});
