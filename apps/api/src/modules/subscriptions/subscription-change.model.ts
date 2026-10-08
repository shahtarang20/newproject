import { Schema, model, Types } from 'mongoose';
import { BILLING_INTERVALS, type BillingInterval } from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '@/database/plugins';

export const CHANGE_STATUSES = ['PENDING_PAYMENT', 'COMPLETED', 'SUPERSEDED', 'FAILED'] as const;
export type SubscriptionChangeStatus = (typeof CHANGE_STATUSES)[number];

/**
 * A requested paid plan change awaiting payment verification. The live Subscription is NOT touched
 * until `POST /subscription/verify` succeeds (never fake success).
 */
export interface ISubscriptionChange extends ITenantDoc {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  interval: BillingInterval;
  amountMinor: number;
  currency: string;
  provider: string;
  providerOrderId: string;
  providerPaymentId?: string;
  status: SubscriptionChangeStatus;
  requestedBy?: Types.ObjectId;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ISubscriptionChange>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    interval: { type: String, enum: BILLING_INTERVALS, required: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    provider: { type: String, required: true },
    providerOrderId: { type: String, required: true },
    providerPaymentId: String,
    status: { type: String, enum: CHANGE_STATUSES, default: 'PENDING_PAYMENT' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.plugin(tenantPlugin);
schema.index({ shopId: 1, status: 1, createdAt: -1 });
schema.index({ provider: 1, providerOrderId: 1 });

export const SubscriptionChange = model<ISubscriptionChange>('SubscriptionChange', schema);
