import { env } from '@/config/env';
import type { PaymentProvider } from './PaymentProvider';
import { NonePaymentProvider } from './none';
import { RazorpayPaymentProvider } from './razorpay';
import { StripePaymentProvider } from './stripe';

let instance: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  if (instance) return instance;
  switch (env.PAYMENT_PROVIDER) {
    case 'razorpay':
      instance = new RazorpayPaymentProvider();
      break;
    case 'stripe':
      instance = new StripePaymentProvider();
      break;
    default:
      instance = new NonePaymentProvider();
  }
  return instance;
}
