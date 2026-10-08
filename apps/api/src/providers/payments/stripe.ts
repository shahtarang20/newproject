import Stripe from 'stripe';
import { env } from '@/config/env';
import type { CreatePaymentOrderInput, CreatePaymentOrderResult, PaymentProvider, VerifyPaymentResult } from './PaymentProvider';

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';
  private client: Stripe;

  constructor() {
    if (!env.STRIPE_SECRET_KEY) throw new Error('PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY');
    this.client = new Stripe(env.STRIPE_SECRET_KEY);
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    const intent = await this.client.paymentIntents.create({
      amount: input.amountMinor,
      currency: input.currency.toLowerCase(),
      metadata: { receipt: input.receipt, ...(input.notes ?? {}) },
      automatic_payment_methods: { enabled: true },
    });
    return {
      providerOrderId: intent.id,
      clientPayload: { provider: 'stripe', paymentIntentId: intent.id, clientSecret: intent.client_secret },
    };
  }

  /** payload: { paymentIntentId } — status is re-read from Stripe, never trusted from the client. */
  async verifyPayment(payload: Record<string, unknown>): Promise<VerifyPaymentResult> {
    const id = payload.paymentIntentId;
    if (typeof id !== 'string') return { ok: false };
    const intent = await this.client.paymentIntents.retrieve(id);
    return intent.status === 'succeeded' ? { ok: true, providerPaymentId: intent.id } : { ok: false };
  }

  /** `paymentId` is the PaymentIntent id. */
  async refund(paymentId: string, amountMinor?: number): Promise<void> {
    await this.client.refunds.create({ payment_intent: paymentId, ...(amountMinor ? { amount: amountMinor } : {}) });
  }

  verifyWebhook(rawBody: Buffer | string, signature: string): boolean {
    if (!env.STRIPE_WEBHOOK_SECRET || !signature) return false;
    try {
      this.client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
      return true;
    } catch {
      return false;
    }
  }
}
