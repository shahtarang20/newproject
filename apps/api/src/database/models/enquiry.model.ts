import { Schema, model, Types } from 'mongoose';
import { ENQUIRY_STATUSES, type EnquiryStatus } from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface IEnquiryNote {
  by?: Types.ObjectId;
  text: string;
  at: Date;
}

export interface IEnquiry extends ITenantDoc {
  _id: Types.ObjectId;
  productId?: Types.ObjectId | null;
  customerId?: Types.ObjectId | null;
  name: string;
  phone: string;
  email?: string;
  message: string;
  status: EnquiryStatus;
  source: 'STOREFRONT' | 'WHATSAPP' | 'MANUAL';
  assignedTo?: Types.ObjectId | null;
  notes: IEnquiryNote[];
  respondedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<IEnquiryNote>(
  { by: { type: Schema.Types.ObjectId, ref: 'User' }, text: { type: String, required: true }, at: { type: Date, default: () => new Date() } },
  { _id: false },
);

const enquirySchema = new Schema<IEnquiry>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    message: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'NEW' },
    source: { type: String, enum: ['STOREFRONT', 'WHATSAPP', 'MANUAL'], default: 'STOREFRONT' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: [noteSchema], default: [] },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
enquirySchema.plugin(tenantPlugin, { index: false });
enquirySchema.index({ shopId: 1, status: 1, createdAt: -1 });
enquirySchema.index({ shopId: 1, productId: 1, createdAt: -1 });
enquirySchema.index({ shopId: 1, phone: 1, createdAt: -1 });

export const Enquiry = model<IEnquiry>('Enquiry', enquirySchema);
