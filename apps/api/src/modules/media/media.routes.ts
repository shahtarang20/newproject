import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { uploadMiddleware } from '@/common/middleware/upload';
import { validate } from '@/common/middleware/validate';
import * as c from './media.controller';
import { mediaParams, productParams, reorderMediaSchema, updateMediaSchema, uploadBodySchema } from './media.schemas';

// Mounted at /products/:productId/media — mergeParams exposes :productId.
const router = Router({ mergeParams: true });
router.use(authenticate, requireShop);

const read = requirePermission('products:read');
const write = requirePermission('products:write');

router.get('/', read, validate({ params: productParams }), c.list);
router.post('/', write, validate({ params: productParams }), ...uploadMiddleware.array('files', 10), validate({ body: uploadBodySchema }), c.upload);
router.patch('/reorder', write, validate({ params: productParams, body: reorderMediaSchema }), c.reorder);
router.patch('/:mediaId/primary', write, validate({ params: mediaParams }), c.primary);
router.patch('/:mediaId', write, validate({ params: mediaParams, body: updateMediaSchema }), c.update);
router.delete('/:mediaId', write, validate({ params: mediaParams }), c.remove);

export default router;
