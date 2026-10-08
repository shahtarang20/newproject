import type { Request } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { Errors } from '@/common/errors';
import { created, ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import * as manage from './orders.manage.service';
import { createOrder } from './orders.service';
import type { CreateDashboardOrderInput, ListOrdersQuery } from './orders.schemas';

const shopIdOf = (req: Request): string => String(tenantFilter(req).shopId);
const idOf = (req: Request): string => String((req.params as { id: string }).id);
const actorOf = (req: Request): manage.Actor => {
  if (!req.auth) throw Errors.unauthorized();
  return { userId: req.auth.userId, ip: req.ip, label: req.auth.staffRole ?? 'Staff' };
};

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await manage.listOrders(shopIdOf(req), req.query as unknown as ListOrdersQuery);
  ok(res, items, 'Orders', meta);
});

export const stats = asyncHandler(async (req, res) => ok(res, await manage.getOrderStats(shopIdOf(req))));

export const get = asyncHandler(async (req, res) => ok(res, await manage.getOrder(shopIdOf(req), idOf(req))));

export const create = asyncHandler(async (req, res) => {
  const actor = actorOf(req);
  const body = req.body as CreateDashboardOrderInput;
  const result = await createOrder(shopIdOf(req), body, { source: 'DASHBOARD', ip: req.ip, actor, markPaid: body.markPaid });
  created(res, result, 'Order created');
});

export const updateStatus = asyncHandler(async (req, res) => ok(res, await manage.updateOrderStatus(shopIdOf(req), idOf(req), req.body, actorOf(req)), 'Order status updated'));
export const updatePayment = asyncHandler(async (req, res) => ok(res, await manage.updateOrderPayment(shopIdOf(req), idOf(req), req.body, actorOf(req)), 'Payment updated'));
export const updateNotes = asyncHandler(async (req, res) => ok(res, await manage.updateOrderNotes(shopIdOf(req), idOf(req), req.body, actorOf(req)), 'Notes saved'));
