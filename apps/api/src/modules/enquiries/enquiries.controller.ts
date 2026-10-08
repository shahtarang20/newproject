import { asyncHandler } from '@/common/asyncHandler';
import { ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import * as svc from './enquiries.service';
import type { ListEnquiriesQuery } from './enquiries.schemas';

const shopId = (req: Parameters<typeof tenantFilter>[0]): string => String(tenantFilter(req).shopId);

export const list = asyncHandler(async (req, res) => {
  const r = await svc.listEnquiries(shopId(req), req.query as unknown as ListEnquiriesQuery);
  ok(res, r.data, 'Enquiries', r.meta);
});

export const stats = asyncHandler(async (req, res) => {
  ok(res, await svc.getEnquiryStats(shopId(req)));
});

export const get = asyncHandler(async (req, res) => {
  ok(res, await svc.getEnquiry(shopId(req), req.params.id));
});

export const update = asyncHandler(async (req, res) => {
  const actor = { userId: req.auth?.userId, shopId: shopId(req), ip: req.ip };
  ok(res, await svc.updateEnquiry(shopId(req), req.params.id, req.body, actor), 'Enquiry updated');
});
