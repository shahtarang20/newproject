import { Schema, model, Types } from 'mongoose';
import { tenantPlugin, type ITenantDoc } from '../plugins';

/** Embedded subdocument (not a collection). */
export interface ICartItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  qty: number;
  addedAt: Date;
}

/** Optional server-side cart. The storefront is guest-first and keeps its cart client-side. */
export interface ICart extends ITenantDoc {
  _id: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  sessionId?: string;
  items: ICartItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    qty: { type: Number, required: true, min: 1 },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    sessionId: String,
    items: { type: [cartItemSchema], default: [] },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 86_400_000) },
  },
  { timestamps: true },
);
cartSchema.plugin(tenantPlugin, { index: false });
cartSchema.index({ shopId: 1, customerId: 1 }, { sparse: true });
cartSchema.index({ shopId: 1, sessionId: 1 }, { sparse: true });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Cart = model<ICart>('Cart', cartSchema);
