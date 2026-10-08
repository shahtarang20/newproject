import { Schema, model, Types } from 'mongoose';
import { tenantPlugin, type ITenantDoc } from '../plugins';

/** Embedded subdocument (not a collection): ordered product list inside a catalogue. */
export interface ICatalogueProduct {
  productId: Types.ObjectId;
  sortOrder: number;
}

export interface ICatalogue extends ITenantDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  /** Categories this catalogue highlights (display/filter only; products list is authoritative). */
  categoryIds: Types.ObjectId[];
  /** Optional visibility window; outside it the catalogue is hidden from the public storefront. */
  startDate?: Date;
  endDate?: Date;
  /** Overrides shop.theme.catalogueLayout when set. */
  layout?: 'grid' | 'masonry' | 'list' | 'editorial';
  products: ICatalogueProduct[];
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const catalogueProductSchema = new Schema<ICatalogueProduct>(
  { productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, sortOrder: { type: Number, default: 0 } },
  { _id: false },
);

const catalogueSchema = new Schema<ICatalogue>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 2000 },
    coverUrl: String,
    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    categoryIds: { type: [Schema.Types.ObjectId], ref: 'Category', default: [] },
    startDate: Date,
    endDate: Date,
    layout: { type: String, enum: ['grid', 'masonry', 'list', 'editorial'] },
    products: { type: [catalogueProductSchema], default: [] },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
catalogueSchema.plugin(tenantPlugin, { index: false });
catalogueSchema.index({ shopId: 1, slug: 1 }, { unique: true });
catalogueSchema.index({ shopId: 1, isActive: 1, isPublic: 1, sortOrder: 1 });
catalogueSchema.index({ shopId: 1, 'products.productId': 1 });

export const Catalogue = model<ICatalogue>('Catalogue', catalogueSchema);
