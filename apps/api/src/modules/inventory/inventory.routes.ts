import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './inventory.controller';
import { adjustStockSchema, inventoryListQuery, transactionsQuery } from './inventory.schemas';

const router = Router();
router.use(authenticate, requireShop);

router.get('/', requirePermission('inventory:read'), validate({ query: inventoryListQuery }), c.list);
router.get('/transactions', requirePermission('inventory:read'), validate({ query: transactionsQuery }), c.transactions);
router.post('/adjust', requirePermission('inventory:write'), validate({ body: adjustStockSchema }), c.adjust);

export default router;
