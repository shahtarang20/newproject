import { Schema, model, Types } from 'mongoose';
import {
  BUSINESS_TYPES,
  BUTTON_STYLES,
  CATALOGUE_LAYOUTS,
  SHOP_STATUSES,
  TEMPLATE_IDS,
  WEEKDAYS,
  DEFAULT_TEMPLATE_ID,
  type BusinessType,
  type ButtonStyle,
  type CatalogueLayout,
  type ShopStatus,
  type TemplateId,
  type Weekday,
} from '@vastra/shared';
import { jsonTransformPlugin } from '../plugins';

export interface IBusinessHours {
  day: Weekday;
  open: string; // "HH:mm"
  close: string;
  closed: boolean;
}

export interface IShopUsage {
  products: number;
  images: number;
  videos: number;
  customers: number;
  staff: number;
  catalogues: number;
  storageBytes: number;
  ordersThisPeriod: number;
  periodStart: Date;
}

export interface IShop {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  businessType: BusinessType;
  logoUrl?: string;
  coverUrl?: string;
  /** Short uppercase prefix used in order numbers, e.g. "RAJ". */
  orderPrefix: string;
  contact: { phone?: string; email?: string; whatsapp?: string };
  address: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country: string };
  socials: { instagram?: string; facebook?: string; youtube?: string; website?: string };
  businessHours: IBusinessHours[];
  theme: { templateId: TemplateId; primaryColor?: string; buttonStyle: ButtonStyle; catalogueLayout: CatalogueLayout };
  seo: { title?: string; description?: string; keywords: string[]; ogImageUrl?: string };
  paymentSettings: { codEnabled: boolean; onlineEnabled: boolean; payAtShopEnabled: boolean; upiId?: string };
  shippingSettings: { deliveryEnabled: boolean; pickupEnabled: boolean; flatRateMinor: number; freeAboveMinor: number | null };
  notificationSettings: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
    emailTo?: string;
    whatsappTo?: string;
    lowStockThreshold: number;
  };
  currency: string;
  status: ShopStatus;
  ownerId: Types.ObjectId;
  subscriptionId?: Types.ObjectId | null;
  usage: IShopUsage;
  createdAt: Date;
  updatedAt: Date;
}

const businessHoursSchema = new Schema<IBusinessHours>(
  {
    day: { type: String, enum: WEEKDAYS, required: true },
    open: { type: String, default: '10:00' },
    close: { type: String, default: '20:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const num0 = { type: Number, default: 0, min: 0 };

const shopSchema = new Schema<IShop>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 4000 },
    businessType: { type: String, enum: BUSINESS_TYPES, default: 'FASHION_STORE' },
    logoUrl: String,
    coverUrl: String,
    orderPrefix: { type: String, required: true, uppercase: true, trim: true, maxlength: 8 },
    contact: { phone: String, email: { type: String, lowercase: true, trim: true }, whatsapp: String },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'IN' },
    },
    socials: { instagram: String, facebook: String, youtube: String, website: String },
    businessHours: { type: [businessHoursSchema], default: [] },
    theme: {
      templateId: { type: String, enum: TEMPLATE_IDS, default: DEFAULT_TEMPLATE_ID },
      primaryColor: String,
      buttonStyle: { type: String, enum: BUTTON_STYLES, default: 'rounded' },
      catalogueLayout: { type: String, enum: CATALOGUE_LAYOUTS, default: 'grid' },
    },
    seo: {
      title: String,
      description: String,
      keywords: { type: [String], default: [] },
      ogImageUrl: String,
    },
    paymentSettings: {
      codEnabled: { type: Boolean, default: true },
      onlineEnabled: { type: Boolean, default: false },
      payAtShopEnabled: { type: Boolean, default: true },
      upiId: String,
    },
    shippingSettings: {
      deliveryEnabled: { type: Boolean, default: true },
      pickupEnabled: { type: Boolean, default: true },
      flatRateMinor: num0,
      freeAboveMinor: { type: Number, default: null },
    },
    notificationSettings: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      emailTo: String,
      whatsappTo: String,
      lowStockThreshold: { type: Number, default: 5, min: 0 },
    },
    currency: { type: String, default: 'INR', uppercase: true },
    status: { type: String, enum: SHOP_STATUSES, default: 'ACTIVE' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null },
    usage: {
      products: num0,
      images: num0,
      videos: num0,
      customers: num0,
      staff: num0,
      catalogues: num0,
      storageBytes: num0,
      ordersThisPeriod: num0,
      periodStart: { type: Date, default: () => new Date() },
    },
  },
  { timestamps: true },
);
shopSchema.index({ status: 1, createdAt: -1 });
shopSchema.index({ name: 'text', slug: 'text' });
shopSchema.plugin(jsonTransformPlugin);

export const Shop = model<IShop>('Shop', shopSchema);
