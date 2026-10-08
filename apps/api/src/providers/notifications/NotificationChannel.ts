import type { NotificationChannel } from '@vastra/shared';

export interface ChannelMessage {
  /** Email address or phone number depending on channel. */
  to: string;
  subject?: string;
  body: string;
  templateKey?: string;
  data?: Record<string, unknown>;
}

export interface NotificationChannelProvider {
  channel: NotificationChannel;
  send(message: ChannelMessage): Promise<void>;
}
