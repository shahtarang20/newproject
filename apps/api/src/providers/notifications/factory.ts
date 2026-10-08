import { env } from '@/config/env';
import type { NotificationChannelProvider } from './NotificationChannel';
import { ConsoleEmailProvider } from './console-email';
import { ResendEmailProvider } from './resend-email';
import { MetaCloudWhatsAppProvider, NoopWhatsAppProvider } from './whatsapp';

let email: NotificationChannelProvider | undefined;
let whatsapp: NotificationChannelProvider | undefined;

export function getEmailProvider(): NotificationChannelProvider {
  email ??= env.EMAIL_PROVIDER === 'resend' ? new ResendEmailProvider() : new ConsoleEmailProvider();
  return email;
}

export function getWhatsAppProvider(): NotificationChannelProvider {
  whatsapp ??= env.WHATSAPP_PROVIDER === 'meta' ? new MetaCloudWhatsAppProvider() : new NoopWhatsAppProvider();
  return whatsapp;
}
