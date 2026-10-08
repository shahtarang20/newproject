import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { uploadMiddleware } from '@/common/middleware/upload';
import { validate } from '@/common/middleware/validate';
import * as c from './catalogues.controller';
import { addProductsBody, createCatalogueBody, idParams, listQuery, removeProductsBody, setProductsBody, updateBody } from './catalogues.schemas';

const router = Router();
const write = requirePermission('catalogues:write');

router.use(authenticate, requireShop);

// reads: any shop user
router.get('/', validate({ query: listQuery }), c.list);
router.get('/:id', validate({ params: idParams }), c.get);
router.get('/:id/share', validate({ params: idParams }), c.share);

// writes: catalogues:write
router.post('/', write, validate({ body: createCatalogueBody }), c.create);
router.patch('/:id', write, validate({ params: idParams, body: updateBody }), c.update);
router.put('/:id', write, validate({ params: idParams, body: updateBody }), c.update);
router.delete('/:id', write, validate({ params: idParams }), c.remove);
router.post('/:id/cover', write, validate({ params: idParams }), ...uploadMiddleware.single('file'), c.uploadCover);
router.put('/:id/products', write, validate({ params: idParams, body: setProductsBody }), c.setProducts);
router.post('/:id/products', write, validate({ params: idParams, body: addProductsBody }), c.addProducts);
router.delete('/:id/products', write, validate({ params: idParams, body: removeProductsBody }), c.removeProducts);
router.post('/:id/publish', write, validate({ params: idParams }), c.publish);
router.post('/:id/unpublish', write, validate({ params: idParams }), c.unpublish);

export default router;
