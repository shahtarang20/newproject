import { Schema, model, Types } from 'mongoose';
import { tenantPlugin, type ITenantDoc } from '../plugins';

/**
 * Daily rollup. `productId = null` is the shop-level row for that day; a row with productId is the per-product row.
 * `date` is a "YYYY-MM-DD" string (UTC day) for cheap range queries.
 */
export interface IAnalyticsDaily extends ITenantDoc {
  _id: Types.ObjectId;
  date: string;
  productId: Types.ObjectId | null;
  /** counts keyed by AnalyticsEventType, e.g. { PRODUCT_VIEW: 12 } */
  counts: Record<string, number>;
  uniqueVisitors: number;
  ordersCount: number;
  revenueMinor: number;
  updatedAt: Date;
}

const dailySchema = new Schema<IAnalyticsDaily>(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    counts: { type: Map, of: Number, default: {} },
    uniqueVisitors: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
    revenueMinor: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true }, minimize: false },
);
dailySchema.plugin(tenantPlugin, { index: false });
dailySchema.index({ shopId: 1, date: 1, productId: 1 }, { unique: true });
dailySchema.index({ shopId: 1, productId: 1, date: -1 });

export const AnalyticsDaily = model<IAnalyticsDaily>('AnalyticsDaily', dailySchema);
