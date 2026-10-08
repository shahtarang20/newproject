import { Schema, model, Types } from 'mongoose';
import { STAFF_ROLES, type StaffRole } from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export const STAFF_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export interface IShopStaff extends ITenantDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  role: StaffRole;
  status: StaffStatus;
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const shopStaffSchema = new Schema<IShopStaff>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: STAFF_ROLES, required: true },
    status: { type: String, enum: STAFF_STATUSES, default: 'ACTIVE' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
shopStaffSchema.plugin(tenantPlugin);
shopStaffSchema.index({ shopId: 1, userId: 1 }, { unique: true });
shopStaffSchema.index({ userId: 1, status: 1 });

export const ShopStaff = model<IShopStaff>('ShopStaff', shopStaffSchema);
