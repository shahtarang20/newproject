import { Router } from 'express';
import { authenticate, requireShop } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './qr.controller';
import { idParams, qrQuery } from './qr.schemas';

const router = Router();
router.use(authenticate, requireShop);

router.get('/shop', validate({ query: qrQuery }), c.shop);
router.get('/catalogue/:id', validate({ params: idParams, query: qrQuery }), c.catalogue);
router.get('/product/:id', validate({ params: idParams, query: qrQuery }), c.product);

export default router;
