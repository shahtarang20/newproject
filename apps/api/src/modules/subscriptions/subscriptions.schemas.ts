import { z } from 'zod';
import { BILLING_INTERVALS } from '@vastra/shared';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const changePlanSchema = z.object({
  planId: objectId,
  interval: z.enum(BILLING_INTERVALS).default('MONTHLY'),
});

export const verifySchema = z.object({
  changeId: objectId,
  /** Provider-specific checkout result (e.g. razorpay_order_id/razorpay_payment_id/razorpay_signature or paymentIntentId). */
  payload: z.record(z.unknown()),
});
