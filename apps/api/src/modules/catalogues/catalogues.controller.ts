import type { Request } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { audit } from '@/common/audit';
import { Errors } from '@/common/errors';
import { created, noContent, ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import { Shop } from '@/database/models';
import { uploadShopAsset } from '@/modules/media/media.service';
import { assertStorage } from '@/modules/subscriptions/limits.service';
import * as svc from './catalogues.service';
import type { ListQuery } from './catalogues.schemas';

const sid = (req: Request) => tenantFilter(req).shopId;
const idOf = (req: Request): string => String(req.params.id);

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await svc.list(sid(req), req.query as unknown as ListQuery);
  ok(res, items, 'Success', meta);
});

export const get = asyncHandler(async (req, res) => ok(res, await svc.getHydrated(sid(req), idOf(req))));

export const create = asyncHandler(async (req, res) => {
  const doc = await svc.create(sid(req), req.body);
  const dto = svc.toDto(doc.toObject());
  void audit(req, { action: 'catalogue.create', entity: 'Catalogue', entityId: dto.id, after: dto });
  created(res, dto, 'Catalogue created');
});

export const update = asyncHandler(async (req, res) => {
  const { before, doc } = await svc.update(sid(req), idOf(req), req.body);
  const dto = svc.toDto(doc.toObject());
  void audit(req, { action: 'catalogue.update', entity: 'Catalogue', entityId: dto.id, before, after: dto });
  ok(res, dto, 'Catalogue updated');
});

export const remove = asyncHandler(async (req, res) => {
  const doc = await svc.remove(sid(req), idOf(req));
  void audit(req, { action: 'catalogue.delete', entity: 'Catalogue', entityId: String(doc._id), before: { name: doc.name, slug: doc.slug } });
  noContent(res);
});

export const setProducts = asyncHandler(async (req, res) => {
  const doc = await svc.setProducts(sid(req), idOf(req), req.body.productIds);
  void audit(req, { action: 'catalogue.products.set', entity: 'Catalogue', entityId: idOf(req), meta: { count: doc.products.length } });
  ok(res, svc.toDto(doc.toObject()), 'Catalogue products updated');
});

export const addProducts = asyncHandler(async (req, res) => {
  const doc = await svc.addProducts(sid(req), idOf(req), req.body.productIds);
  void audit(req, { action: 'catalogue.products.add', entity: 'Catalogue', entityId: idOf(req), meta: { added: req.body.productIds.length } });
  ok(res, svc.toDto(doc.toObject()), 'Products added');
});

export const removeProducts = asyncHandler(async (req, res) => {
  const doc = await svc.removeProducts(sid(req), idOf(req), req.body.productIds);
  void audit(req, { action: 'catalogue.products.remove', entity: 'Catalogue', entityId: idOf(req), meta: { removed: req.body.productIds.length } });
  ok(res, svc.toDto(doc.toObject()), 'Products removed');
});

const publishWith = (published: boolean) =>
  asyncHandler(async (req, res) => {
    const doc = await svc.setPublished(sid(req), idOf(req), published);
    void audit(req, { action: published ? 'catalogue.publish' : 'catalogue.unpublish', entity: 'Catalogue', entityId: idOf(req) });
    ok(res, svc.toDto(doc.toObject()), published ? 'Catalogue published' : 'Catalogue unpublished');
  });
export const publish = publishWith(true);
export const unpublish = publishWith(false);

export const uploadCover = asyncHandler(async (req, res) => {
  if (!req.file) throw Errors.badRequest('VALIDATION_ERROR', 'Cover image file is required (field "file")');
  if (!req.file.mimetype.startsWith('image/')) throw Errors.badRequest('UPLOAD_INVALID_TYPE', 'Cover must be an image');
  const shopId = sid(req);
  await assertStorage(shopId, req.file.size);
  const asset = await uploadShopAsset(String(shopId), req.file, 'catalogues');
  const doc = await svc.setCover(shopId, idOf(req), asset.url);
  void audit(req, { action: 'catalogue.cover', entity: 'Catalogue', entityId: idOf(req) });
  ok(res, svc.toDto(doc.toObject()), 'Cover updated');
});

export const share = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(sid(req)).select('name slug').lean();
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  ok(res, await svc.getShare(sid(req), shop.slug, shop.name, idOf(req)));
});
