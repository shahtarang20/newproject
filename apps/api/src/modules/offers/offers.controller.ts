import type { Request } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { audit } from '@/common/audit';
import { created, noContent, ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import * as svc from './offers.admin.service';
import type { OfferListQuery } from './offers.schemas';

const shopIdOf = (req: Request): string => String(tenantFilter(req).shopId);
const idOf = (req: Request): string => String((req.params as { id: string }).id);

export const listOffers = asyncHandler(async (req, res) => {
  const { items, meta } = await svc.listOffers(shopIdOf(req), req.query as unknown as OfferListQuery);
  ok(res, items, 'Offers', meta);
});
export const getOffer = asyncHandler(async (req, res) => ok(res, await svc.getOffer(shopIdOf(req), idOf(req))));
export const createOffer = asyncHandler(async (req, res) => {
  const offer = await svc.createOffer(shopIdOf(req), req.body);
  void audit(req, { action: 'offer.create', entity: 'Offer', entityId: offer.id, after: offer });
  created(res, offer, 'Offer created');
});
export const updateOffer = asyncHandler(async (req, res) => {
  const offer = await svc.updateOffer(shopIdOf(req), idOf(req), req.body);
  void audit(req, { action: 'offer.update', entity: 'Offer', entityId: offer.id, after: offer });
  ok(res, offer, 'Offer updated');
});
export const toggleOffer = asyncHandler(async (req, res) => {
  const offer = await svc.toggleOffer(shopIdOf(req), idOf(req));
  void audit(req, { action: 'offer.toggle', entity: 'Offer', entityId: offer.id, after: { isActive: offer.isActive } });
  ok(res, offer, offer.isActive ? 'Offer activated' : 'Offer deactivated');
});
export const deleteOffer = asyncHandler(async (req, res) => {
  await svc.deleteOffer(shopIdOf(req), idOf(req));
  void audit(req, { action: 'offer.delete', entity: 'Offer', entityId: idOf(req) });
  noContent(res);
});

export const listCoupons = asyncHandler(async (req, res) => {
  const { items, meta } = await svc.listCoupons(shopIdOf(req), req.query as unknown as OfferListQuery);
  ok(res, items, 'Coupons', meta);
});
export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await svc.createCoupon(shopIdOf(req), req.body);
  void audit(req, { action: 'coupon.create', entity: 'Coupon', entityId: coupon.id, after: coupon });
  created(res, coupon, 'Coupon created');
});
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await svc.updateCoupon(shopIdOf(req), idOf(req), req.body);
  void audit(req, { action: 'coupon.update', entity: 'Coupon', entityId: coupon.id, after: coupon });
  ok(res, coupon, 'Coupon updated');
});
export const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await svc.toggleCoupon(shopIdOf(req), idOf(req));
  void audit(req, { action: 'coupon.toggle', entity: 'Coupon', entityId: coupon.id, after: { isActive: coupon.isActive } });
  ok(res, coupon, coupon.isActive ? 'Coupon activated' : 'Coupon deactivated');
});
export const deleteCoupon = asyncHandler(async (req, res) => {
  await svc.deleteCoupon(shopIdOf(req), idOf(req));
  void audit(req, { action: 'coupon.delete', entity: 'Coupon', entityId: idOf(req) });
  noContent(res);
});
