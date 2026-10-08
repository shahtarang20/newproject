import { asyncHandler } from '@/common/asyncHandler';
import { tenantFilter } from '@/common/tenant';
import { created, noContent, ok } from '@/common/response';
import { actorOf, parseId } from '../products/product.utils';
import * as svc from './media.service';
import type { UploadBody } from './media.schemas';

export const list = asyncHandler(async (req, res) => {
  ok(res, await svc.listMedia(tenantFilter(req).shopId, parseId(req.params.productId)));
});

export const upload = asyncHandler(async (req, res) => {
  const body = req.body as UploadBody;
  const durations = body.durationSec === undefined ? [] : Array.isArray(body.durationSec) ? body.durationSec : [body.durationSec];
  const files = Array.isArray(req.files) ? req.files : [];
  const items = await svc.uploadProductMedia(
    tenantFilter(req).shopId,
    parseId(req.params.productId),
    files,
    { durations, altText: body.altText, userId: req.auth?.userId },
    actorOf(req),
  );
  created(res, items, `${items.length} file(s) uploaded`);
});

export const reorder = asyncHandler(async (req, res) => {
  ok(res, await svc.reorderMedia(tenantFilter(req).shopId, parseId(req.params.productId), (req.body as { orderedIds: string[] }).orderedIds, actorOf(req)), 'Media reordered');
});

export const primary = asyncHandler(async (req, res) => {
  ok(res, await svc.setPrimary(tenantFilter(req).shopId, parseId(req.params.productId), parseId(req.params.mediaId), actorOf(req)), 'Primary image updated');
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await svc.updateMedia(tenantFilter(req).shopId, parseId(req.params.productId), parseId(req.params.mediaId), req.body, actorOf(req)), 'Media updated');
});

export const remove = asyncHandler(async (req, res) => {
  await svc.deleteMedia(tenantFilter(req).shopId, parseId(req.params.productId), parseId(req.params.mediaId), actorOf(req));
  noContent(res);
});
