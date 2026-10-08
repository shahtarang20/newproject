import { Schema, model, Types } from 'mongoose';
import { GLOBAL_ROLES, type GlobalRole } from '@vastra/shared';
import { jsonTransformPlugin } from '../plugins';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  phone?: string;
  name: string;
  /** bcrypt hash. select:false — must be explicitly selected with `+passwordHash`. */
  passwordHash: string;
  role: GlobalRole;
  /** Primary shop for SHOP_USER (owner). Staff memberships live in ShopStaff. */
  shopId?: Types.ObjectId | null;
  avatarUrl?: string;
  isActive: boolean;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: GLOBAL_ROLES, required: true, default: 'CUSTOMER' },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', default: null },
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ shopId: 1 }, { sparse: true });
userSchema.plugin(jsonTransformPlugin);

export const User = model<IUser>('User', userSchema);
