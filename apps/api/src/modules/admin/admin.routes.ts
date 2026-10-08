import { Router } from 'express';
import { authenticate, requireRole } from '@/common/middleware/auth';
import { validate } from '@/common/middleware/validate';
import * as c from './admin.controller';
import {
  analyticsQuery,
  idParams,
  logsQuery,
  planCreateSchema,
  planUpdateSchema,
  plansListQuery,
  settingsSchema,
  shopLimitsSchema,
  shopPlanSchema,
  shopStatusSchema,
  shopsListQuery,
  storageQuery,
  subscriptionUpdateSchema,
  subscriptionsListQuery,
  userUpdateSchema,
  usersListQuery,
} from './admin.schemas';

const router = Router();
router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/shops', validate({ query: shopsListQuery }), c.shopsList);
router.get('/shops/:id', validate({ params: idParams }), c.shopGet);
router.patch('/shops/:id/status', validate({ params: idParams, body: shopStatusSchema }), c.shopStatus);
router.patch('/shops/:id/limits', validate({ params: idParams, body: shopLimitsSchema }), c.shopLimits);
router.patch('/shops/:id/plan', validate({ params: idParams, body: shopPlanSchema }), c.shopPlan);

router.get('/users', validate({ query: usersListQuery }), c.usersList);
router.get('/users/:id', validate({ params: idParams }), c.userGet);
router.patch('/users/:id', validate({ params: idParams, body: userUpdateSchema }), c.userUpdate);

router.get('/plans', validate({ query: plansListQuery }), c.plansList);
router.post('/plans', validate({ body: planCreateSchema }), c.planCreate);
router.get('/plans/:id', validate({ params: idParams }), c.planGet);
router.patch('/plans/:id', validate({ params: idParams, body: planUpdateSchema }), c.planUpdate);
router.delete('/plans/:id', validate({ params: idParams }), c.planDelete);

router.get('/subscriptions', validate({ query: subscriptionsListQuery }), c.subsList);
router.patch('/subscriptions/:id', validate({ params: idParams, body: subscriptionUpdateSchema }), c.subUpdate);

router.get('/analytics', validate({ query: analyticsQuery }), c.analyticsGet);
router.get('/storage', validate({ query: storageQuery }), c.storageGet);
router.get('/settings', c.settingsGet);
router.put('/settings', validate({ body: settingsSchema }), c.settingsPut);
router.get('/logs', validate({ query: logsQuery }), c.logsList);

export default router;
