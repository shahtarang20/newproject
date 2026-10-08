import Razorpay from 'razorpay';
import { env } from '@/config/env';
import { hmacSha256Hex, safeEqual } from '@/common/utils/hash';
import type { CreatePaymentOrderInput, CreatePaymentOrderResult, PaymentProvider, VerifyPaymentResult } from './PaymentProvider';

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay';
  private client: Razorpay;
  private keyId: string;
  private keySecret: string;

  constructor() {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('PAYMENT_PROVIDER=razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
    }
    this.keyId = env.RAZORPAY_KEY_ID;
    this.keySecret = env.RAZORPAY_KEY_SECRET;
    this.client = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    const order = await this.client.orders.create({
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    });
    return {
      providerOrderId: order.id,
      clientPayload: { provider: 'razorpay', keyId: this.keyId, orderId: order.id, amount: order.amount, currency: order.currency },
    };
  }

  /** payload: { razorpay_order_id, razorpay_payment_id, razorpay_signature } */
  async verifyPayment(payload: Record<string, unknown>): Promise<VerifyPaymentResult> {
    const orderId = payload.razorpay_order_id;
    const paymentId = payload.razorpay_payment_id;
    const signature = payload.razorpay_signature;
    if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') return { ok: false };
    const expected = hmacSha256Hex(this.keySecret, `${orderId}|${paymentId}`);
    return safeEqual(expected, signature) ? { ok: true, providerPaymentId: paymentId } : { ok: false };
  }

  async refund(paymentId: string, amountMinor?: number): Promise<void> {
    await this.client.payments.refund(paymentId, amountMinor ? { amount: amountMinor } : {});
  }

  verifyWebhook(rawBody: Buffer | string, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
    return safeEqual(hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
  }
}
