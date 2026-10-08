import type { Request, Response } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { audit } from '@/common/audit';
import { Errors } from '@/common/errors';
import { created, noContent, ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import * as svc from './staff.service';

const shopId = (req: Request): string => String(tenantFilter(req).shopId);
const actor = (req: Request): string => {
  if (!req.auth) throw Errors.unauthorized();
  return req.auth.userId;
};

export const list = asyncHandler(async (req: Request, res: Response) => ok(res, await svc.listStaff(shopId(req))));

export const permissions = asyncHandler(async (_req: Request, res: Response) => ok(res, svc.getPermissionsMap()));

export const invite = asyncHandler(async (req: Request, res: Response) => {
  const staff = await svc.inviteStaff(shopId(req), actor(req), req.body);
  await audit(req, { action: 'staff.invited', entity: 'ShopStaff', entityId: staff.id, after: { email: staff.email, role: staff.role } });
  return created(res, staff, 'Invitation sent');
});

export const resend = asyncHandler(async (req: Request, res: Response) => {
  await svc.resendInvite(shopId(req), req.params.id);
  await audit(req, { action: 'staff.invite_resent', entity: 'ShopStaff', entityId: req.params.id });
  return ok(res, { sent: true }, 'Invitation re-sent');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { staff, before, after } = await svc.updateStaff(shopId(req), actor(req), req.params.id, req.body);
  await audit(req, { action: 'staff.updated', entity: 'ShopStaff', entityId: req.params.id, before, after });
  return ok(res, staff, 'Staff updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const removed = await svc.removeStaff(shopId(req), actor(req), req.params.id);
  await audit(req, { action: 'staff.removed', entity: 'ShopStaff', entityId: req.params.id, before: removed });
  return noContent(res);
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.acceptInvite(req.body.token, req.body.password);
  await audit({ userId: result.userId, shopId: result.shopId, ip: req.ip }, { action: 'staff.invite_accepted', entity: 'ShopStaff' });
  return ok(res, { email: result.email }, 'Password set. You can now sign in.');
});
