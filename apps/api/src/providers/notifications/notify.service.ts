import type { NotificationChannel, NotificationType } from '@vastra/shared';
import { logger } from '@/config/logger';
import { Shop } from '@/database/models/shop.model';
import { User } from '@/database/models/user.model';
import { getEmailProvider, getWhatsAppProvider } from './factory';
import { writeInAppNotification } from './inapp';

export interface NotifyInput {
  shopId?: string;
  userId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Defaults to ['IN_APP']. Shop-directed sends are filtered by shop.notificationSettings. */
  channels?: NotificationChannel[];
  /**
   * Customer-directed send: explicit recipient addresses. Settings gating is skipped and no in-app
   * record is written unless userId/shopId are also given and IN_APP is requested.
   */
  recipient?: { email?: string; phone?: string };
}

/**
 * Persists an in-app Notification and fans out to email/WhatsApp per shop.notificationSettings.
 * NEVER throws — failures are logged so business flows (orders, enquiries) are never broken by notifications.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const requested = input.channels?.length ? input.channels : (['IN_APP'] as NotificationChannel[]);
    const shop = input.shopId
      ? await Shop.findById(input.shopId).select('notificationSettings contact ownerId name').lean()
      : null;
    const settings = shop?.notificationSettings;
    const customerDirected = Boolean(input.recipient);

    const allowed = (c: NotificationChannel): boolean => {
      if (!requested.includes(c)) return false;
      if (customerDirected || !settings) return true;
      if (c === 'IN_APP') return settings.inApp;
      if (c === 'EMAIL') return settings.email;
      if (c === 'WHATSAPP') return settings.whatsapp;
      return false; // SMS: no provider yet
    };

    const tasks: Array<Promise<unknown>> = [];

    if (allowed('IN_APP') && (input.shopId || input.userId)) {
      tasks.push(
        writeInAppNotification({
          shopId: input.shopId,
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data,
          channels: requested,
        }),
      );
    }

    if (allowed('EMAIL')) {
      let to = input.recipient?.email ?? settings?.emailTo ?? shop?.contact?.email;
      if (!to && shop?.ownerId) to = (await User.findById(shop.ownerId).select('email').lean())?.email;
      if (to) {
        tasks.push(getEmailProvider().send({ to, subject: input.title, body: input.body, templateKey: input.type, data: input.data }));
      }
    }

    if (allowed('WHATSAPP')) {
      const to = input.recipient?.phone ?? settings?.whatsappTo ?? shop?.contact?.whatsapp;
      if (to) tasks.push(getWhatsAppProvider().send({ to, body: `${input.title}\n${input.body}`, templateKey: input.type, data: input.data }));
    }

    const results = await Promise.allSettled(tasks);
    for (const r of results) if (r.status === 'rejected') logger.warn({ err: r.reason, type: input.type }, 'notification channel failed');
  } catch (err) {
    logger.warn({ err, type: input.type }, 'notify failed');
  }
}
