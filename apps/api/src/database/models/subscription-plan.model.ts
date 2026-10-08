import { Schema, model, Types } from 'mongoose';
import { FEATURE_KEYS, LIMIT_KEYS, type PlanFeatures, type PlanLimits } from '@vastra/shared';
import { jsonTransformPlugin } from '../plugins';

export interface ISubscriptionPlan {
  _id: Types.ObjectId;
  /** Stable machine code, e.g. FREE, STARTER. Unique. */
  code: string;
  name: string;
  description?: string;
  priceMinor: { MONTHLY: number; YEARLY: number };
  currency: string;
  trialDays: number;
  /** null value = unlimited. Edited by super admin; never hard-coded in enforcement. */
  limits: PlanLimits;
  features: PlanFeatures;
  isPublic: boolean;
  isActive: boolean;
  /** The plan assigned to new shops (exactly one should be true). */
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const limitsDef = Object.fromEntries(LIMIT_KEYS.map((k) => [k, { type: Number, default: null, min: 0 }]));
const featuresDef = Object.fromEntries(FEATURE_KEYS.map((k) => [k, { type: Boolean, default: false }]));

const planSchema = new Schema<ISubscriptionPlan>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: String,
    priceMinor: { MONTHLY: { type: Number, default: 0, min: 0 }, YEARLY: { type: Number, default: 0, min: 0 } },
    currency: { type: String, default: 'INR', uppercase: true },
    trialDays: { type: Number, default: 0, min: 0 },
    limits: limitsDef,
    features: featuresDef,
    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
planSchema.index({ isPublic: 1, isActive: 1, sortOrder: 1 });
planSchema.plugin(jsonTransformPlugin);

export const SubscriptionPlan = model<ISubscriptionPlan>('SubscriptionPlan', planSchema);
