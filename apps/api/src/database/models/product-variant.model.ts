import { Schema, model, Types } from 'mongoose';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface IProductVariant extends ITenantDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sku?: string;
  colour?: { name: string; hex?: string };
  size?: string;
  sellingPriceMinor: number;
  mrpMinor: number;
  costPriceMinor?: number;
  stock: number;
  lowStockThreshold?: number;
  barcode?: string;
  imageUrl?: string;
  /** Media doc this variant's image comes from (imageUrl is the denormalised URL). */
  imageMediaId?: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IProductVariant>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, trim: true },
    colour: { name: { type: String, trim: true }, hex: String },
    size: { type: String, trim: true },
    sellingPriceMinor: { type: Number, required: true, min: 0 },
    mrpMinor: { type: Number, default: 0, min: 0 },
    costPriceMinor: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: Number,
    barcode: String,
    imageUrl: String,
    imageMediaId: { type: Schema.Types.ObjectId, ref: 'Media', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
variantSchema.plugin(tenantPlugin, { index: false });
variantSchema.index({ shopId: 1, productId: 1, isActive: 1 });
variantSchema.index({ shopId: 1, sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
variantSchema.index({ shopId: 1, stock: 1 });

export const ProductVariant = model<IProductVariant>('ProductVariant', variantSchema);
