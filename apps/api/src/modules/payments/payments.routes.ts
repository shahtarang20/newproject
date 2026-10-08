import { Router } from 'express';
import * as c from './payments.controller';

/** Mounted at /api/webhooks. Raw body is captured in app.ts (req.rawBody) before JSON parsing. */
const router = Router();
router.post('/razorpay', c.razorpayWebhook);
router.post('/stripe', c.stripeWebhook);

export default router;
