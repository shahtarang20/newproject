import { Resend } from 'resend';
import { env } from '@/config/env';
import type { ChannelMessage, NotificationChannelProvider } from './NotificationChannel';

const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export class ResendEmailProvider implements NotificationChannelProvider {
  readonly channel = 'EMAIL' as const;
  private client: Resend;

  constructor() {
    if (!env.EMAIL_API_KEY) throw new Error('EMAIL_PROVIDER=resend requires EMAIL_API_KEY');
    this.client = new Resend(env.EMAIL_API_KEY);
  }

  async send(m: ChannelMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: m.to,
      subject: m.subject ?? 'Notification',
      text: m.body,
      html: `<div style="font-family:Inter,Arial,sans-serif;white-space:pre-line">${escapeHtml(m.body)}</div>`,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
  }
}
