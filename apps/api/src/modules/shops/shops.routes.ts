import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { publicRateLimit } from '@/common/middleware/rateLimit';
import { uploadMiddleware } from '@/common/middleware/upload';
import { validate } from '@/common/middleware/validate';
import * as c from './shops.controller';
import { publicSlugParams, updateShopSchema } from './shops.schemas';

const router = Router();

// Public — must be registered before the authenticated block.
router.get('/public/:slug', publicRateLimit, validate({ params: publicSlugParams }), c.publicShop);

router.use(authenticate, requireShop);
router.get('/', c.get);
router.patch('/', requirePermission('settings:write'), validate({ body: updateShopSchema }), c.update);
router.post('/logo', requirePermission('settings:write'), ...uploadMiddleware.single('file'), c.logo);
router.post('/cover', requirePermission('settings:write'), ...uploadMiddleware.single('file'), c.cover);
router.get('/usage', c.usage);
router.get('/templates', c.templates);

export default router;
