import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './customers.controller';
import { createCustomerSchema, exportCustomersQuery, idParams, listCustomersQuery, updateCustomerSchema } from './customers.schemas';

const router = Router();
router.use(authenticate, requireShop);

router.get('/', requirePermission('customers:read'), validate({ query: listCustomersQuery }), c.list);
router.get('/export', requirePermission('customers:read'), validate({ query: exportCustomersQuery }), c.exportCsv);
router.post('/', requirePermission('customers:write'), validate({ body: createCustomerSchema }), c.create);
router.get('/:id', requirePermission('customers:read'), validate({ params: idParams }), c.get);
router.patch('/:id', requirePermission('customers:write'), validate({ params: idParams, body: updateCustomerSchema }), c.update);

export default router;
