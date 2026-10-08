import { Schema, model, Types } from 'mongoose';
import { tenantPlugin, type ITenantDoc } from '@/database/plugins';

/** Pending staff invitation. Only the sha256 of the emailed token is stored. TTL removes it after expiry. */
export interface IStaffInvite extends ITenantDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const schema = new Schema<IStaffInvite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.plugin(tenantPlugin);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const StaffInvite = model<IStaffInvite>('StaffInvite', schema);
