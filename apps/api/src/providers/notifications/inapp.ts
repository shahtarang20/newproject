import { Types } from 'mongoose';
import type { NotificationChannel, NotificationType } from '@vastra/shared';
import { Notification, type INotification } from '@/database/models/notification.model';

export interface InAppInput {
  shopId?: string;
  userId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
}

const oid = (v?: string): Types.ObjectId | null => (v && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : null);

/** In-app channel writer: persists the Notification document (the dashboard reads these). */
export async function writeInAppNotification(input: InAppInput): Promise<INotification> {
  const doc = await Notification.create({
    shopId: oid(input.shopId),
    userId: oid(input.userId),
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data,
    channels: input.channels,
  });
  return doc.toObject();
}
