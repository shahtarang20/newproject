import type { Request, Response } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { audit } from '@/common/audit';
import { Errors } from '@/common/errors';
import { ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import * as svc from './subscriptions.service';

const shopId = (req: Request): string => String(tenantFilter(req).shopId);

export const publicPlans = asyncHandler(async (_req: Request, res: Response) => ok(res, await svc.listPublicPlans()));

export const plans = asyncHandler(async (_req: Request, res: Response) => ok(res, await svc.listPublicPlans()));

export const current = asyncHandler(async (req: Request, res: Response) => ok(res, await svc.getSubscriptionOverview(shopId(req))));

export const change = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Errors.unauthorized();
  const { before, after, ...result } = await svc.changePlan(shopId(req), req.auth.userId, req.body);
  await audit(req, {
    action: result.status === 'COMPLETED' ? 'subscription.plan_changed' : 'subscription.change_requested',
    entity: 'Subscription',
    before: { planId: before },
    after: { planId: after, interval: req.body.interval, status: result.status },
  });
  return ok(res, result, result.status === 'COMPLETED' ? 'Plan updated' : 'Payment required to complete the plan change');
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await svc.verifyPlanPayment(shopId(req), req.body);
  await audit(req, { action: 'subscription.payment_verified', entity: 'Subscription', after: { changeId: req.body.changeId } });
  return ok(res, subscription, 'Payment verified, plan updated');
});
