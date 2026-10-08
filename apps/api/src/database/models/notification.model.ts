import { Schema, model, Types } from 'mongoose';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, type NotificationChannel, type NotificationType } from '@vastra/shared';
import { jsonTransformPlugin } from '../plugins';

/** In-app notification record. `shopId` is optional (platform-level notifications target a user only). */
export interface INotification {
  _id: Types.ObjectId;
  shopId?: Types.ObjectId | null;
  userId?: Types.ObjectId | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  readAt?: Date | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    data: { type: Schema.Types.Mixed },
    channels: { type: [{ type: String, enum: NOTIFICATION_CHANNELS }], default: ['IN_APP'] },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
notificationSchema.index({ shopId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
// Auto-clean after 180 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 86_400 });
notificationSchema.plugin(jsonTransformPlugin);

export const Notification = model<INotification>('Notification', notificationSchema);
