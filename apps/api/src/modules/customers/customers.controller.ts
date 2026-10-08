import type { Request } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { created, ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import * as svc from './customers.service';
import type { ListCustomersQuery } from './customers.schemas';

const shopId = (req: Request): string => String(tenantFilter(req).shopId);
const actor = (req: Request) => ({ userId: req.auth?.userId, shopId: shopId(req), ip: req.ip });

export const list = asyncHandler(async (req, res) => {
  const r = await svc.listCustomers(shopId(req), req.query as unknown as ListCustomersQuery);
  ok(res, r.data, 'Customers', r.meta);
});

export const get = asyncHandler(async (req, res) => {
  ok(res, await svc.getCustomerDetail(shopId(req), req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  created(res, await svc.createCustomer(shopId(req), req.body, actor(req)), 'Customer added');
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await svc.updateCustomer(shopId(req), req.params.id, req.body, actor(req)), 'Customer updated');
});

export const exportCsv = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`);
  for await (const chunk of svc.exportCustomersCsv(shopId(req), req.query as unknown as ListCustomersQuery)) {
    if (!res.write(chunk)) await new Promise<void>((resolve) => res.once('drain', resolve));
  }
  res.end();
});
