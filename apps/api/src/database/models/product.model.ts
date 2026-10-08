import { Schema, model, Types } from 'mongoose';
import {
  FABRICS,
  GENDERS,
  MEDIA_KINDS,
  OCCASIONS,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  SAREE_TYPES,
  SAREE_WORK_TYPES,
  SEASONS,
  type Fabric,
  type Gender,
  type MediaKind,
  type Occasion,
  type ProductStatus,
  type ProductType,
  type SareeType,
  type SareeWorkType,
  type Season,
} from '@vastra/shared';
import { softDeletePlugin, tenantPlugin, type ISoftDeleteDoc, type ITenantDoc } from '../plugins';

/** Embedded media reference (denormalised from the Media collection for single-read product payloads). */
export interface IProductMediaRef {
  mediaId: Types.ObjectId;
  kind: MediaKind;
  url: string;
  thumbUrl?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ISareeAttrs {
  sareeType?: SareeType;
  fabric?: Fabric;
  workTypes: SareeWorkType[];
  lengthMeters?: number;
  blouseIncluded?: boolean;
  blouseDescription?: string;
  border?: string;
  pallu?: string;
  weave?: string;
  careInstructions?: string;
}

export interface IGarmentAttrs {
  fit?: string;
  pattern?: string;
  sleeveType?: string;
  neckType?: string;
  fabricComposition?: string;
  washCare?: string;
}

export interface IProductPricing {
  minSellingMinor: number;
  maxSellingMinor: number;
  mrpMinor: number;
  /** Best per-variant discount %, derived from variants. */
  discountPercent: number;
  taxPercent: number;
  /** When true the storefront shows "Enquire for price" instead of the price. */
  hidePrice: boolean;
}

export interface IProduct extends ITenantDoc, ISoftDeleteDoc {
  _id: Types.ObjectId;
  type: ProductType;
  name: string;
  slug: string;
  sku?: string;
  brand?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: Types.ObjectId | null;
  tags: string[];
  gender?: Gender;
  occasions: Occasion[];
  fabric?: Fabric;
  season?: Season;
  sareeAttrs?: ISareeAttrs;
  garmentAttrs?: IGarmentAttrs;
  pricing: IProductPricing;
  /** Denormalised from active variants for fast filtering. */
  colours: string[];
  sizes: string[];
  stockTotal: number;
  lowStockThreshold?: number;
  status: ProductStatus;
  isFeatured: boolean;
  media: IProductMediaRef[];
  mediaIds: Types.ObjectId[];
  primaryImageUrl?: string;
  primaryThumbUrl?: string;
  seo: { title?: string; description?: string };
  viewCount: number;
  soldCount: number;
  shareCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const mediaRefSchema = new Schema<IProductMediaRef>(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true },
    kind: { type: String, enum: MEDIA_KINDS, default: 'IMAGE' },
    url: { type: String, required: true },
    thumbUrl: String,
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const productSchema = new Schema<IProduct>(
  {
    type: { type: String, enum: PRODUCT_TYPES, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    sku: { type: String, trim: true },
    brand: { type: String, trim: true },
    description: { type: String, maxlength: 10000 },
    shortDescription: { type: String, maxlength: 500 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    tags: { type: [String], default: [] },
    gender: { type: String, enum: GENDERS },
    occasions: { type: [{ type: String, enum: OCCASIONS }], default: [] },
    fabric: { type: String, enum: FABRICS },
    season: { type: String, enum: SEASONS },
    sareeAttrs: {
      sareeType: { type: String, enum: SAREE_TYPES },
      fabric: { type: String, enum: FABRICS },
      workTypes: { type: [{ type: String, enum: SAREE_WORK_TYPES }], default: [] },
      lengthMeters: Number,
      blouseIncluded: Boolean,
      blouseDescription: String,
      border: String,
      pallu: String,
      weave: String,
      careInstructions: String,
    },
    garmentAttrs: {
      fit: String,
      pattern: String,
      sleeveType: String,
      neckType: String,
      fabricComposition: String,
      washCare: String,
    },
    pricing: {
      minSellingMinor: { type: Number, default: 0, min: 0 },
      maxSellingMinor: { type: Number, default: 0, min: 0 },
      mrpMinor: { type: Number, default: 0, min: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      taxPercent: { type: Number, default: 0, min: 0, max: 100 },
      hidePrice: { type: Boolean, default: false },
    },
    colours: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    stockTotal: { type: Number, default: 0 },
    lowStockThreshold: Number,
    status: { type: String, enum: PRODUCT_STATUSES, default: 'DRAFT' },
    isFeatured: { type: Boolean, default: false },
    media: { type: [mediaRefSchema], default: [] },
    mediaIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Media' }], default: [] },
    primaryImageUrl: String,
    primaryThumbUrl: String,
    seo: { title: String, description: String },
    viewCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
productSchema.plugin(tenantPlugin, { index: false });
productSchema.plugin(softDeletePlugin);

// NOTE: unique slug includes soft-deleted rows. products.service MUST free the slug on soft delete (e.g. append `-deleted-<ts>`).
productSchema.index({ shopId: 1, slug: 1 }, { unique: true });
productSchema.index({ shopId: 1, status: 1, deletedAt: 1, createdAt: -1 });
productSchema.index({ shopId: 1, categoryId: 1, status: 1 });
productSchema.index({ shopId: 1, type: 1, status: 1 });
productSchema.index({ shopId: 1, isFeatured: 1, status: 1 });
productSchema.index({ shopId: 1, 'pricing.minSellingMinor': 1 });
productSchema.index({ shopId: 1, soldCount: -1 });
productSchema.index({ shopId: 1, sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
productSchema.index(
  { shopId: 1, name: 'text', sku: 'text', tags: 'text', brand: 'text' },
  { weights: { name: 10, sku: 8, brand: 4, tags: 3 }, name: 'product_text' },
);

export const Product = model<IProduct>('Product', productSchema);
