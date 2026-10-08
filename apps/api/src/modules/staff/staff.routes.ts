import { Router } from 'express';
import { authenticate, requirePermission, requireShop } from '@/common/middleware/auth';
import { authRateLimit } from '@/common/middleware/rateLimit';
import { validate } from '@/common/middleware/validate';
import * as c from './staff.controller';
import { acceptInviteSchema, idParams, inviteSchema, updateStaffSchema } from './staff.schemas';

const router = Router();

// Public: invited staff set their password.
router.post('/accept-invite', authRateLimit, validate({ body: acceptInviteSchema }), c.acceptInvite);

router.use(authenticate, requireShop, requirePermission('staff:manage'));
router.get('/permissions', c.permissions);
router.get('/', c.list);
router.post('/invite', validate({ body: inviteSchema }), c.invite);
router.post('/:id/resend-invite', validate({ params: idParams }), c.resend);
router.patch('/:id', validate({ params: idParams, body: updateStaffSchema }), c.update);
router.delete('/:id', validate({ params: idParams }), c.remove);

export default router;
