import { Schema, model, Types } from 'mongoose';
import {
  BILLING_INTERVALS,
  LIMIT_KEYS,
  SUBSCRIPTION_STATUSES,
  type BillingInterval,
  type PlanLimits,
  type SubscriptionStatus,
} from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface ISubscription extends ITenantDoc {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currentPeriodStart: Date;
  currentPeriodEnd: Date | null;
  trialEndsAt?: Date | null;
  cancelAtPeriodEnd: boolean;
  /** Per-shop overrides laid over plan.limits. A key present with `null` means unlimited. */
  limitOverrides: Partial<PlanLimits>;
  providerSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true, index: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, default: 'ACTIVE' },
    interval: { type: String, enum: BILLING_INTERVALS, default: 'MONTHLY' },
    currentPeriodStart: { type: Date, default: () => new Date() },
    currentPeriodEnd: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    // minimize:false keeps explicit `null` (unlimited) overrides; absent keys are simply not stored.
    limitOverrides: {
      type: Object.fromEntries(LIMIT_KEYS.map((k) => [k, { type: Number, default: undefined }])),
      default: {},
    },
    providerSubscriptionId: String,
  },
  { timestamps: true, minimize: false },
);
// One subscription document per shop (history is out of scope for v1).
subscriptionSchema.plugin(tenantPlugin, { unique: true });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
