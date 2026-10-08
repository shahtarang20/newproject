import { z } from 'zod';
import { BUSINESS_TYPES, BUTTON_STYLES, CATALOGUE_LAYOUTS, TEMPLATE_IDS, WEEKDAYS } from '@vastra/shared';
import { SLUG_PATTERN } from '@/common/slug';

const str = (max: number) => z.string().trim().max(max);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');
const hex = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Use a hex colour like #7a1f2b');

export const updateShopSchema = z
  .object({
    name: str(120).min(2),
    slug: z.string().trim().toLowerCase().min(3).max(60).regex(SLUG_PATTERN, 'Lowercase letters, numbers and hyphens only'),
    tagline: str(200),
    description: str(4000),
    businessType: z.enum(BUSINESS_TYPES),
    contact: z
      .object({ phone: str(20), email: z.string().trim().toLowerCase().email().or(z.literal('')), whatsapp: str(20) })
      .partial(),
    address: z
      .object({ line1: str(200), line2: str(200), city: str(100), state: str(100), pincode: str(12), country: str(2) })
      .partial(),
    socials: z.object({ instagram: str(300), facebook: str(300), youtube: str(300), website: str(300) }).partial(),
    businessHours: z
      .array(z.object({ day: z.enum(WEEKDAYS), open: time, close: time, closed: z.boolean() }))
      .max(7)
      .refine((a) => new Set(a.map((d) => d.day)).size === a.length, 'Duplicate day'),
    seo: z
      .object({ title: str(120), description: str(300), keywords: z.array(str(40)).max(20), ogImageUrl: str(500) })
      .partial(),
    theme: z
      .object({
        templateId: z.enum(TEMPLATE_IDS),
        primaryColor: hex.or(z.literal('')),
        buttonStyle: z.enum(BUTTON_STYLES),
        catalogueLayout: z.enum(CATALOGUE_LAYOUTS),
      })
      .partial(),
    paymentSettings: z
      .object({ codEnabled: z.boolean(), onlineEnabled: z.boolean(), payAtShopEnabled: z.boolean(), upiId: str(100) })
      .partial(),
    shippingSettings: z
      .object({
        deliveryEnabled: z.boolean(),
        pickupEnabled: z.boolean(),
        flatRateMinor: z.number().int().min(0),
        freeAboveMinor: z.number().int().min(0).nullable(),
      })
      .partial(),
    notificationSettings: z
      .object({
        inApp: z.boolean(),
        email: z.boolean(),
        whatsapp: z.boolean(),
        emailTo: z.string().trim().email().or(z.literal('')),
        whatsappTo: str(20),
        lowStockThreshold: z.number().int().min(0).max(100000),
      })
      .partial(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export type UpdateShopInput = z.infer<typeof updateShopSchema>;

export const publicSlugParams = z.object({ slug: z.string().trim().toLowerCase().min(1).max(80) });
