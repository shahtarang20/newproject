import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './enquiries.controller';
import { idParams, listEnquiriesQuery, updateEnquirySchema } from './enquiries.schemas';

/** Dashboard enquiries. The public create endpoint lives in storefront (POST /storefront/:slug/enquiries). */
const router = Router();
router.use(authenticate, requireShop);

router.get('/', requirePermission('enquiries:read'), validate({ query: listEnquiriesQuery }), c.list);
router.get('/stats', requirePermission('enquiries:read'), c.stats);
router.get('/:id', requirePermission('enquiries:read'), validate({ params: idParams }), c.get);
router.patch('/:id', requirePermission('enquiries:write'), validate({ params: idParams, body: updateEnquirySchema }), c.update);

export default router;
