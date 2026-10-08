import { Schema, model, Types } from 'mongoose';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface IAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export const addressDefinition = {
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true },
  landmark: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  country: { type: String, default: 'IN' },
};

export interface ICustomerAddress extends ITenantDoc, IAddress {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  label?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerAddressSchema = new Schema<ICustomerAddress>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    label: String,
    isDefault: { type: Boolean, default: false },
    ...addressDefinition,
  },
  { timestamps: true },
);
customerAddressSchema.plugin(tenantPlugin, { index: false });
customerAddressSchema.index({ shopId: 1, customerId: 1, isDefault: -1 });

export const CustomerAddress = model<ICustomerAddress>('CustomerAddress', customerAddressSchema);
