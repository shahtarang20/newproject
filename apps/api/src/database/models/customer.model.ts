import { Schema, model, Types } from 'mongoose';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface ICustomer extends ITenantDoc {
  _id: Types.ObjectId;
  name: string;
  /** Normalised phone (digits, optional leading +). Unique per shop. */
  phone: string;
  email?: string;
  /** Linked global CUSTOMER account, if the customer registered. */
  userId?: Types.ObjectId | null;
  tags: string[];
  notes?: string;
  source: 'ORDER' | 'ENQUIRY' | 'MANUAL' | 'ACCOUNT';
  isBlocked: boolean;
  stats: { ordersCount: number; totalSpentMinor: number; lastOrderAt?: Date | null };
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    tags: { type: [String], default: [] },
    notes: { type: String, maxlength: 2000 },
    source: { type: String, enum: ['ORDER', 'ENQUIRY', 'MANUAL', 'ACCOUNT'], default: 'MANUAL' },
    isBlocked: { type: Boolean, default: false },
    stats: {
      ordersCount: { type: Number, default: 0 },
      totalSpentMinor: { type: Number, default: 0 },
      lastOrderAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);
customerSchema.plugin(tenantPlugin, { index: false });
customerSchema.index({ shopId: 1, phone: 1 }, { unique: true });
customerSchema.index({ shopId: 1, createdAt: -1 });
customerSchema.index({ shopId: 1, 'stats.totalSpentMinor': -1 });
customerSchema.index({ shopId: 1, name: 1 });
customerSchema.index({ shopId: 1, userId: 1 }, { sparse: true });

export const Customer = model<ICustomer>('Customer', customerSchema);
