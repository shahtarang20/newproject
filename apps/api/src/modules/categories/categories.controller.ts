import { asyncHandler } from '@/common/asyncHandler';
import { tenantFilter } from '@/common/tenant';
import { created, noContent, ok } from '@/common/response';
import { Errors } from '@/common/errors';
import { actorOf } from '../products/product.utils';
import { uploadShopAsset } from '../media/media.service';
import * as svc from './categories.service';
import type { ListCategoriesQuery } from './categories.schemas';

export const list = asyncHandler(async (req, res) => {
  ok(res, await svc.listCategories(tenantFilter(req).shopId, req.query as ListCategoriesQuery));
});

export const get = asyncHandler(async (req, res) => {
  ok(res, await svc.getCategory(tenantFilter(req).shopId, req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  created(res, await svc.createCategory(tenantFilter(req).shopId, req.body, actorOf(req)), 'Category created');
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await svc.updateCategory(tenantFilter(req).shopId, req.params.id, req.body, actorOf(req)), 'Category updated');
});

export const reorder = asyncHandler(async (req, res) => {
  await svc.reorderCategories(tenantFilter(req).shopId, (req.body as { items: Array<{ id: string; sortOrder: number }> }).items, actorOf(req));
  noContent(res);
});

export const remove = asyncHandler(async (req, res) => {
  await svc.deleteCategory(tenantFilter(req).shopId, req.params.id, (req.query as { reassignTo?: string }).reassignTo, actorOf(req));
  noContent(res);
});

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw Errors.badRequest('VALIDATION_ERROR', 'Attach an image in the "file" field');
  const { shopId } = tenantFilter(req);
  // TODO(category-image-cleanup): the previous image object is not deleted (Category stores only imageUrl, no storage key).
  const asset = await uploadShopAsset(shopId, req.file, 'categories');
  ok(res, await svc.setCategoryImage(shopId, req.params.id, asset.url, actorOf(req)), 'Category image updated');
});
