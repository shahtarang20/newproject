import { Schema, model, Types } from 'mongoose';
import { INVENTORY_TXN_TYPES, type InventoryTxnType } from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface IInventoryTransaction extends ITenantDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  type: InventoryTxnType;
  /** Signed delta applied to variant stock (SALE/DAMAGE negative, PURCHASE/RETURN positive). */
  quantity: number;
  balanceAfter: number;
  reason?: string;
  orderId?: Types.ObjectId;
  unitCostMinor?: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const txnSchema = new Schema<IInventoryTransaction>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    type: { type: String, enum: INVENTORY_TXN_TYPES, required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: String,
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    unitCostMinor: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
txnSchema.plugin(tenantPlugin, { index: false });
txnSchema.index({ shopId: 1, createdAt: -1 });
txnSchema.index({ shopId: 1, productId: 1, createdAt: -1 });
txnSchema.index({ shopId: 1, variantId: 1, createdAt: -1 });
txnSchema.index({ shopId: 1, orderId: 1, type: 1 });

export const InventoryTransaction = model<IInventoryTransaction>('InventoryTransaction', txnSchema);
