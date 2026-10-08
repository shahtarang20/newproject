import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './analytics.controller';
import { dashboardQuery, productsQuery, rangeQuery, salesQuery } from './analytics.schemas';

const router = Router();
router.use(authenticate, requireShop, requirePermission('analytics:read'));

router.get('/dashboard', validate({ query: dashboardQuery }), c.dashboard);
router.get('/products', validate({ query: productsQuery }), c.products);
router.get('/sales', validate({ query: salesQuery }), c.sales);
router.get('/funnel', validate({ query: rangeQuery }), c.funnel);

export default router;
