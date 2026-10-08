import { logger } from '@/config/logger';
import type { ChannelMessage, NotificationChannelProvider } from './NotificationChannel';

/** Dev/default email channel: logs instead of sending. */
export class ConsoleEmailProvider implements NotificationChannelProvider {
  readonly channel = 'EMAIL' as const;
  async send(m: ChannelMessage): Promise<void> {
    logger.info({ to: m.to, subject: m.subject, body: m.body }, '[email:console]');
  }
}
