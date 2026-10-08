import { Schema, model, Types } from 'mongoose';
import { DISCOUNT_TYPES, type DiscountType } from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface ICoupon extends ITenantDoc {
  _id: Types.ObjectId;
  /** Uppercase, unique per shop. */
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  maxDiscountMinor?: number | null;
  minOrderMinor: number;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  usedCount: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 32 },
    description: String,
    discountType: { type: String, enum: DISCOUNT_TYPES, required: true },
    value: { type: Number, default: 0, min: 0 },
    maxDiscountMinor: { type: Number, default: null },
    minOrderMinor: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: null },
    perCustomerLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
couponSchema.plugin(tenantPlugin, { index: false });
couponSchema.index({ shopId: 1, code: 1 }, { unique: true });
couponSchema.index({ shopId: 1, isActive: 1, endsAt: 1 });

export const Coupon = model<ICoupon>('Coupon', couponSchema);
