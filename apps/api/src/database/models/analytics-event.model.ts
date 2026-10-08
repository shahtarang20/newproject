import { Schema, model, Types } from 'mongoose';
import { ANALYTICS_EVENT_TYPES, type AnalyticsEventType } from '@vastra/shared';
import { ANALYTICS_EVENT_TTL_DAYS } from '@/config/constants';
import { tenantPlugin, type ITenantDoc } from '../plugins';

export interface IAnalyticsEvent extends ITenantDoc {
  _id: Types.ObjectId;
  type: AnalyticsEventType;
  productId?: Types.ObjectId | null;
  catalogueId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  /** Anonymous client-generated visitor/session ids (no PII). */
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  device?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const eventSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, enum: ANALYTICS_EVENT_TYPES, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    catalogueId: { type: Schema.Types.ObjectId, ref: 'Catalogue', default: null },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    visitorId: String,
    sessionId: String,
    referrer: String,
    device: String,
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
eventSchema.plugin(tenantPlugin, { index: false });
eventSchema.index({ shopId: 1, type: 1, createdAt: -1 });
eventSchema.index({ shopId: 1, productId: 1, type: 1, createdAt: -1 });
// TTL: raw events expire after 400 days; use AnalyticsDaily for long-term trends.
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: ANALYTICS_EVENT_TTL_DAYS * 86_400 });

export const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', eventSchema);
