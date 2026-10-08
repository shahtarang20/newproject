import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './offers.controller';
import { createCouponSchema, createOfferSchema, idParams, listQuery, updateCouponSchema, updateOfferSchema } from './offers.schemas';

const router = Router();
router.use(authenticate, requireShop);

const write = requirePermission('offers:write');

// Coupons (declared before "/:id" so "coupons" is not treated as an id)
router.get('/coupons', write, validate({ query: listQuery }), c.listCoupons);
router.post('/coupons', write, validate({ body: createCouponSchema }), c.createCoupon);
router.patch('/coupons/:id', write, validate({ params: idParams, body: updateCouponSchema }), c.updateCoupon);
router.patch('/coupons/:id/toggle', write, validate({ params: idParams }), c.toggleCoupon);
router.delete('/coupons/:id', write, validate({ params: idParams }), c.deleteCoupon);

// Offers
router.get('/', write, validate({ query: listQuery }), c.listOffers);
router.post('/', write, validate({ body: createOfferSchema }), c.createOffer);
router.get('/:id', write, validate({ params: idParams }), c.getOffer);
router.patch('/:id', write, validate({ params: idParams, body: updateOfferSchema }), c.updateOffer);
router.patch('/:id/toggle', write, validate({ params: idParams }), c.toggleOffer);
router.delete('/:id', write, validate({ params: idParams }), c.deleteOffer);

export default router;
