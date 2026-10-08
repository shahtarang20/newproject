import { Schema, model, Types } from 'mongoose';
import { PAYMENT_METHODS, PAYMENT_STATUSES, type PaymentMethod, type PaymentStatus } from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface IPayment extends ITenantDoc {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  /** razorpay | stripe | none | cod | shop */
  provider: string;
  method: PaymentMethod;
  providerOrderId?: string;
  providerPaymentId?: string;
  amountMinor: number;
  refundedMinor: number;
  currency: string;
  status: PaymentStatus;
  failureReason?: string;
  /** Webhook event ids already applied (idempotency). */
  processedEventIds: string[];
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    provider: { type: String, required: true },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    providerOrderId: String,
    providerPaymentId: String,
    amountMinor: { type: Number, required: true, min: 0 },
    refundedMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
    failureReason: String,
    processedEventIds: { type: [String], default: [] },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);
paymentSchema.plugin(tenantPlugin, { index: false });
paymentSchema.index({ shopId: 1, orderId: 1 });
paymentSchema.index({ shopId: 1, status: 1, createdAt: -1 });
// Webhooks resolve payments by provider ids before the tenant is known.
paymentSchema.index({ provider: 1, providerOrderId: 1 }, { sparse: true });
paymentSchema.index({ provider: 1, providerPaymentId: 1 }, { sparse: true });

export const Payment = model<IPayment>('Payment', paymentSchema);
