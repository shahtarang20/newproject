import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { uploadMiddleware } from '@/common/middleware/upload';
import { validate } from '@/common/middleware/validate';
import * as c from './categories.controller';
import {
  createCategorySchema,
  deleteCategoryQuery,
  idParam,
  listCategoriesQuery,
  reorderCategoriesSchema,
  updateCategorySchema,
} from './categories.schemas';

const router = Router();
router.use(authenticate, requireShop);

const read = requirePermission('products:read');
const write = requirePermission('categories:write');

router.get('/', read, validate({ query: listCategoriesQuery }), c.list);
router.patch('/reorder', write, validate({ body: reorderCategoriesSchema }), c.reorder);
router.get('/:id', read, validate({ params: idParam }), c.get);
router.post('/', write, validate({ body: createCategorySchema }), c.create);
router.patch('/:id', write, validate({ params: idParam, body: updateCategorySchema }), c.update);
router.post('/:id/image', write, validate({ params: idParam }), ...uploadMiddleware.single('file'), c.uploadImage);
router.delete('/:id', write, validate({ params: idParam, query: deleteCategoryQuery }), c.remove);

export default router;
