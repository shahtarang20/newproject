import { asyncHandler } from '@/common/asyncHandler';
import { Errors } from '@/common/errors';
import { ok } from '@/common/response';
import { handleWebhook, type WebhookProvider } from './payments.service';

const webhook = (provider: WebhookProvider, header: string) =>
  asyncHandler(async (req, res) => {
    const signature = req.get(header) ?? '';
    if (!req.rawBody) throw Errors.badRequest('VALIDATION_ERROR', 'Missing raw body');
    const { handled } = await handleWebhook(provider, req.rawBody, signature);
    ok(res, { received: true, handled }, 'Webhook received');
  });

export const razorpayWebhook = webhook('razorpay', 'x-razorpay-signature');
export const stripeWebhook = webhook('stripe', 'stripe-signature');
