import { Schema, model, Types } from 'mongoose';
import { DISCOUNT_TYPES, type DiscountType } from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export const OFFER_SCOPES = ['ALL', 'PRODUCTS', 'CATEGORIES'] as const;
export type OfferScope = (typeof OFFER_SCOPES)[number];

export interface IOffer extends ITenantDoc {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  badgeText?: string;
  discountType: DiscountType;
  /** PERCENT: 0-100. FLAT: minor units. BUY_X_GET_Y: unused. */
  value: number;
  maxDiscountMinor?: number | null;
  buyQty?: number;
  getQty?: number;
  scope: OfferScope;
  productIds: Types.ObjectId[];
  categoryIds: Types.ObjectId[];
  minOrderMinor: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: String,
    badgeText: { type: String, maxlength: 40 },
    discountType: { type: String, enum: DISCOUNT_TYPES, required: true },
    value: { type: Number, default: 0, min: 0 },
    maxDiscountMinor: { type: Number, default: null },
    buyQty: Number,
    getQty: Number,
    scope: { type: String, enum: OFFER_SCOPES, default: 'ALL' },
    productIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    categoryIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [] },
    minOrderMinor: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
offerSchema.plugin(tenantPlugin, { index: false });
offerSchema.index({ shopId: 1, isActive: 1, startsAt: 1, endsAt: 1 });

export const Offer = model<IOffer>('Offer', offerSchema);
