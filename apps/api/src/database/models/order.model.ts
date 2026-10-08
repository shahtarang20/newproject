import { Schema, model, Types } from 'mongoose';
import {
  DELIVERY_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type DeliveryType,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@vastra/shared';
import { tenantPlugin, type ITenantDoc } from '../plugins';
import { addressDefinition, type IAddress } from './customer-address.model';

/** Embedded snapshot line (not a collection). Prices are frozen at order time. */
export interface IOrderItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  name: string;
  sku?: string;
  colour?: string;
  size?: string;
  imageUrl?: string;
  unitPriceMinor: number;
  mrpMinor: number;
  qty: number;
  discountMinor: number;
  taxPercent: number;
  taxMinor: number;
  lineTotalMinor: number;
}

/** Embedded timeline entry (not a collection). */
export interface IOrderTimelineEntry {
  status: OrderStatus;
  at: Date;
  by?: Types.ObjectId | null;
  byLabel?: string;
  note?: string;
}

export interface IOrder extends ITenantDoc {
  _id: Types.ObjectId;
  /** `{PREFIX}-{YYYY}-{000123}` — unique per shop. */
  orderNumber: string;
  customerId?: Types.ObjectId | null;
  customerSnapshot: { name: string; phone: string; email?: string };
  items: IOrderItem[];
  deliveryType: DeliveryType;
  address?: IAddress;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  couponCode?: string;
  couponId?: Types.ObjectId | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  timeline: IOrderTimelineEntry[];
  customerNote?: string;
  internalNote?: string;
  cancelReason?: string;
  /** Guards "restore stock exactly once" on CANCELLED/REJECTED. */
  stockRestored: boolean;
  source: 'STOREFRONT' | 'DASHBOARD';
  placedByIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    name: { type: String, required: true },
    sku: String,
    colour: String,
    size: String,
    imageUrl: String,
    unitPriceMinor: { type: Number, required: true, min: 0 },
    mrpMinor: { type: Number, default: 0, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    discountMinor: { type: Number, default: 0, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0 },
    taxMinor: { type: Number, default: 0, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const timelineSchema = new Schema<IOrderTimelineEntry>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: () => new Date() },
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    byLabel: String,
    note: String,
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerSnapshot: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, lowercase: true, trim: true },
    },
    items: { type: [orderItemSchema], validate: [(v: unknown[]) => v.length > 0, 'Order must have at least one item'] },
    deliveryType: { type: String, enum: DELIVERY_TYPES, default: 'DELIVERY' },
    address: { type: new Schema<IAddress>(addressDefinition, { _id: false }), required: false },
    subtotalMinor: { type: Number, required: true, min: 0 },
    discountMinor: { type: Number, default: 0, min: 0 },
    taxMinor: { type: Number, default: 0, min: 0 },
    shippingMinor: { type: Number, default: 0, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    couponCode: String,
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
    status: { type: String, enum: ORDER_STATUSES, default: 'PENDING' },
    timeline: { type: [timelineSchema], default: [] },
    customerNote: { type: String, maxlength: 1000 },
    internalNote: { type: String, maxlength: 2000 },
    cancelReason: String,
    stockRestored: { type: Boolean, default: false },
    source: { type: String, enum: ['STOREFRONT', 'DASHBOARD'], default: 'STOREFRONT' },
    placedByIp: String,
  },
  { timestamps: true },
);
orderSchema.plugin(tenantPlugin, { index: false });
orderSchema.index({ shopId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, customerId: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, 'customerSnapshot.phone': 1, createdAt: -1 });
orderSchema.index({ shopId: 1, paymentStatus: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);
