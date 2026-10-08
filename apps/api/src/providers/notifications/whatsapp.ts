import { env } from '@/config/env';
import { logger } from '@/config/logger';
import type { ChannelMessage, NotificationChannelProvider } from './NotificationChannel';

/** Default: WhatsApp disabled. */
export class NoopWhatsAppProvider implements NotificationChannelProvider {
  readonly channel = 'WHATSAPP' as const;
  async send(m: ChannelMessage): Promise<void> {
    logger.debug({ to: m.to }, '[whatsapp:none] skipped (WHATSAPP_PROVIDER=none)');
  }
}

/**
 * Meta WhatsApp Cloud API. Free-form text messages only work inside the 24h customer-service window;
 * TODO(whatsapp-templates): use approved template messages (`templateKey`) for business-initiated sends.
 */
export class MetaCloudWhatsAppProvider implements NotificationChannelProvider {
  readonly channel = 'WHATSAPP' as const;

  constructor() {
    if (!env.WHATSAPP_API_KEY || !env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WHATSAPP_PROVIDER=meta requires WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID');
    }
  }

  async send(m: ChannelMessage): Promise<void> {
    const to = m.to.replace(/[^\d]/g, '');
    const res = await fetch(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WHATSAPP_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: m.body, preview_url: false } }),
    });
    if (!res.ok) throw new Error(`WhatsApp Cloud API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
