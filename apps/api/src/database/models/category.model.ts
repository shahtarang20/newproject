import { Schema, model, Types } from 'mongoose';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface ICategory extends ITenantDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  /** Tree via parentId (null = root). */
  parentId?: Types.ObjectId | null;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, maxlength: 1000 },
    imageUrl: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
categorySchema.plugin(tenantPlugin, { index: false });
categorySchema.index({ shopId: 1, slug: 1 }, { unique: true });
categorySchema.index({ shopId: 1, parentId: 1, sortOrder: 1 });

export const Category = model<ICategory>('Category', categorySchema);
