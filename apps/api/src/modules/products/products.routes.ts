import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './products.controller';
import { createProductSchema, idParam, listProductsQuery, statusSchema, updateProductSchema } from './products.schemas';
import { productIdParam, variantCreateSchema, variantParams, variantUpdateSchema } from './variants.schemas';

const router = Router();
router.use(authenticate, requireShop);

const read = requirePermission('products:read');
const write = requirePermission('products:write');
const del = requirePermission('products:delete');

// NOTE: literal segments (e.g. a future /bulk router) must be mounted before these `/:id` routes by the bulk owner.
router.get('/', read, validate({ query: listProductsQuery }), c.list);
router.post('/', write, validate({ body: createProductSchema }), c.create);
router.get('/:id', read, validate({ params: idParam }), c.get);
router.patch('/:id', write, validate({ params: idParam, body: updateProductSchema }), c.update);
router.delete('/:id', del, validate({ params: idParam }), c.remove);
router.post('/:id/duplicate', write, validate({ params: idParam }), c.duplicate);
router.patch('/:id/status', write, validate({ params: idParam, body: statusSchema }), c.setStatus);

router.get('/:id/variants', read, validate({ params: productIdParam }), c.listVariants);
router.post('/:id/variants', write, validate({ params: productIdParam, body: variantCreateSchema }), c.addVariant);
router.patch('/:id/variants/:variantId', write, validate({ params: variantParams, body: variantUpdateSchema }), c.updateVariant);
router.delete('/:id/variants/:variantId', write, validate({ params: variantParams }), c.deleteVariant);

export default router;
