import { Schema, model, Types } from 'mongoose';
import { MEDIA_KINDS, type MediaKind } from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface IMedia extends ITenantDoc {
  _id: Types.ObjectId;
  productId?: Types.ObjectId | null;
  kind: MediaKind;
  url: string;
  thumbUrl?: string;
  /** ~160px WebP placeholder (images only). */
  tinyUrl?: string;
  /** Storage keys of the thumb/tiny renditions (for deletion). */
  thumbKey?: string;
  tinyKey?: string;
  /** Optional link to the product variant this image depicts. */
  variantId?: Types.ObjectId | null;
  /** Storage provider key, used for deletion. */
  key: string;
  provider: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    kind: { type: String, enum: MEDIA_KINDS, required: true },
    url: { type: String, required: true },
    thumbUrl: String,
    tinyUrl: String,
    thumbKey: String,
    tinyKey: String,
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    key: { type: String, required: true },
    provider: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    width: Number,
    height: Number,
    durationSec: Number,
    altText: String,
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
mediaSchema.plugin(tenantPlugin, { index: false });
mediaSchema.index({ shopId: 1, productId: 1, sortOrder: 1 });
mediaSchema.index({ shopId: 1, kind: 1, createdAt: -1 });

export const Media = model<IMedia>('Media', mediaSchema);
