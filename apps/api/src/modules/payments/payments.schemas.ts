import { z } from 'zod';

/** Body of POST /storefront/:slug/payments/verify. `payload` is the provider checkout result (see README). */
export const verifyPaymentSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  payload: z.record(z.unknown()),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
