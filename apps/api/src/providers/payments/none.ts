import { Errors } from '@/common/errors';
import type { CreatePaymentOrderResult, PaymentProvider, VerifyPaymentResult } from './PaymentProvider';

/** Online payments disabled. Every online operation fails honestly. */
export class NonePaymentProvider implements PaymentProvider {
  readonly name = 'none';

  async createOrder(): Promise<CreatePaymentOrderResult> {
    throw Errors.badRequest('PAYMENT_METHOD_DISABLED', 'Online payments are not enabled on this platform');
  }
  async verifyPayment(): Promise<VerifyPaymentResult> {
    return { ok: false };
  }
  async refund(): Promise<void> {
    throw Errors.badRequest('PAYMENT_METHOD_DISABLED', 'Online payments are not enabled on this platform');
  }
  verifyWebhook(): boolean {
    return false;
  }
}
