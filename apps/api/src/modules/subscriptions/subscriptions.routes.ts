import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { publicRateLimit } from '@/common/middleware/rateLimit';
import { validate } from '@/common/middleware/validate';
import * as c from './subscriptions.controller';
import { changePlanSchema, verifySchema } from './subscriptions.schemas';

const router = Router();

// Public (marketing site pricing)
router.get('/public-plans', publicRateLimit, c.publicPlans);

router.use(authenticate, requireShop);
router.get('/', c.current);
router.get('/plans', c.plans);
router.post('/change', requirePermission('subscription:manage'), validate({ body: changePlanSchema }), c.change);
router.post('/verify', requirePermission('subscription:manage'), validate({ body: verifySchema }), c.verify);

export default router;
