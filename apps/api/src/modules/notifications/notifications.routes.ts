import { Router } from 'express';
import { authenticate } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './notifications.controller';
import { idParams, listQuery } from './notifications.schemas';

const router = Router();
router.use(authenticate);
router.get('/', validate({ query: listQuery }), c.list);
router.post('/read-all', c.readAll);
router.patch('/:id/read', validate({ params: idParams }), c.read);

export default router;
