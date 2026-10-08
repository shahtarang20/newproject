import { Router } from 'express';
import { authenticate } from '@/common/middleware/auth';
import { authRateLimit, publicRateLimit, sessionRateLimit } from '@/common/middleware/rateLimit';
import { validate } from '@/common/middleware/validate';
import * as c from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerCustomerSchema,
  registerSchema,
  resetPasswordSchema,
  slugAvailableQuery,
} from './auth.schemas';

const router = Router();

router.post('/register', authRateLimit, validate({ body: registerSchema }), c.register);
router.post('/register-customer', authRateLimit, validate({ body: registerCustomerSchema }), c.registerCustomer);
router.post('/login', authRateLimit, validate({ body: loginSchema }), c.login);
router.post('/refresh', sessionRateLimit, c.refresh);
router.post('/logout', sessionRateLimit, c.logout);
router.get('/me', sessionRateLimit, authenticate, c.me);
router.post('/change-password', authRateLimit, authenticate, validate({ body: changePasswordSchema }), c.changePassword);
router.get('/slug-available', publicRateLimit, validate({ query: slugAvailableQuery }), c.slugAvailable);
// TODO(password-reset): both endpoints currently respond 501 NOT_IMPLEMENTED.
router.post('/forgot-password', authRateLimit, validate({ body: forgotPasswordSchema }), c.forgotPassword);
router.post('/reset-password', authRateLimit, validate({ body: resetPasswordSchema }), c.resetPassword);

export default router;
