import { asyncHandler } from '@/common/asyncHandler';
import { tenantFilter } from '@/common/tenant';
import { created, noContent, ok } from '@/common/response';
import { Errors } from '@/common/errors';
import { actorOf, parseId } from './product.utils';
import * as svc from './products.service';
import * as lifecycle from './products.lifecycle';
import * as variants from './variants.service';
import type { ListProductsQuery } from './products.schemas';

const shop = (req: Parameters<typeof tenantFilter>[0]) => tenantFilter(req).shopId;

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await svc.listProducts(shop(req), req.query as ListProductsQuery);
  ok(res, items, 'Success', meta);
});
export const get = asyncHandler(async (req, res) => ok(res, await svc.getProduct(shop(req), req.params.id)));
export const create = asyncHandler(async (req, res) => created(res, await svc.createProduct(shop(req), req.body, actorOf(req)), 'Product created'));
export const update = asyncHandler(async (req, res) => ok(res, await svc.updateProduct(shop(req), req.params.id, req.body, actorOf(req)), 'Product updated'));
export const remove = asyncHandler(async (req, res) => {
  await lifecycle.deleteProduct(shop(req), req.params.id, actorOf(req));
  noContent(res);
});
export const duplicate = asyncHandler(async (req, res) => created(res, await lifecycle.duplicateProduct(shop(req), req.params.id, actorOf(req)), 'Product duplicated'));
export const setStatus = asyncHandler(async (req, res) =>
  ok(res, await svc.setProductStatus(shop(req), req.params.id, (req.body as { status: Parameters<typeof svc.setProductStatus>[2] }).status, actorOf(req)), 'Status updated'),
);

export const listVariants = asyncHandler(async (req, res) => ok(res, await variants.listVariants(shop(req), parseId(req.params.id))));
export const addVariant = asyncHandler(async (req, res) =>
  created(res, await variants.addVariant(shop(req), parseId(req.params.id), req.body, actorOf(req)), 'Variant created'),
);
export const updateVariant = asyncHandler(async (req, res) => {
  // Changing stock is an inventory operation: require inventory:write in addition to products:write.
  const perms = req.auth?.permissions ?? [];
  const privileged = req.auth?.staffRole === 'OWNER' || req.auth?.role === 'SUPER_ADMIN';
  if ((req.body as { stock?: number }).stock !== undefined && !privileged && !perms.includes('inventory:write')) {
    throw Errors.forbidden('Missing permission: inventory:write (required to change stock)');
  }
  ok(res, await variants.updateVariant(shop(req), parseId(req.params.id), parseId(req.params.variantId), req.body, actorOf(req)), 'Variant updated');
});
export const deleteVariant = asyncHandler(async (req, res) =>
  ok(res, await variants.deleteVariant(shop(req), parseId(req.params.id), parseId(req.params.variantId), actorOf(req)), 'Variant removed'),
);
