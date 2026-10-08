export interface CreatePaymentOrderInput {
  amountMinor: number;
  currency: string;
  /** Our order number / id used as the provider receipt. */
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreatePaymentOrderResult {
  providerOrderId: string;
  /** Opaque payload the web client needs to open the checkout (key id, order id, client secret …). */
  clientPayload: Record<string, unknown>;
}

export interface VerifyPaymentResult {
  ok: boolean;
  providerPaymentId?: string;
}

export interface PaymentProvider {
  name: string;
  createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult>;
  /** `payload` is the provider-specific object posted by the client after checkout. */
  verifyPayment(payload: Record<string, unknown>): Promise<VerifyPaymentResult>;
  refund(paymentId: string, amountMinor?: number): Promise<void>;
  verifyWebhook(rawBody: Buffer | string, signature: string): boolean;
}
