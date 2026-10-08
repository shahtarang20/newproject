import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { orderRateLimit } from '@/common/middleware/rateLimit';
import { validate } from '@/common/middleware/validate';
import * as c from './orders.controller';
import { createDashboardOrderSchema, idParams, listOrdersQuery, updateNotesSchema, updatePaymentSchema, updateStatusSchema } from './orders.schemas';

const router = Router();
router.use(authenticate, requireShop);

router.get('/', requirePermission('orders:read'), validate({ query: listOrdersQuery }), c.list);
router.get('/stats', requirePermission('orders:read'), c.stats); // before "/:id"
router.post('/', requirePermission('orders:create'), orderRateLimit, validate({ body: createDashboardOrderSchema }), c.create);
router.get('/:id', requirePermission('orders:read'), validate({ params: idParams }), c.get);
router.patch('/:id/status', requirePermission('orders:write'), validate({ params: idParams, body: updateStatusSchema }), c.updateStatus);
router.patch('/:id/payment', requirePermission('orders:write'), validate({ params: idParams, body: updatePaymentSchema }), c.updatePayment);
router.patch('/:id/notes', requirePermission('orders:write'), validate({ params: idParams, body: updateNotesSchema }), c.updateNotes);

export default router;
