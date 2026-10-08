import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './bulk.controller';
import { csvOptionsBody, priceBody, statusBody, stockBody } from './bulk.schemas';
import { csvUpload } from './bulk.upload';

const router = Router();
router.use(authenticate, requireShop, requirePermission('products:write'));

router.get('/products/template', c.template);
router.post('/products/validate', ...csvUpload, validate({ body: csvOptionsBody }), c.validate);
router.post('/products/import', ...csvUpload, validate({ body: csvOptionsBody }), c.importProducts);
router.get('/products/export', c.exportProducts);

router.post('/price', validate({ body: priceBody }), c.price);
router.post('/stock', validate({ body: stockBody }), c.stock);
router.post('/status', validate({ body: statusBody }), c.status);

export default router;
