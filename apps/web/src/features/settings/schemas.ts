import { z } from 'zod';
import { BUSINESS_TYPES, WEEKDAYS } from '@vastra/shared';
import type { ShopDto, UpdateShopInput } from '@/types/settings';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');
const optionalEmail = z.string().trim().email('Enter a valid email').or(z.literal(''));
const money = z.string().trim().regex(/^\d{0,9}(\.\d{1,2})?$/, 'Enter a valid amount');

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Shop name must be at least 2 characters').max(120),
  tagline: z.string().trim().max(200),
  description: z.string().trim().max(4000),
  businessType: z.enum(BUSINESS_TYPES),
  contact: z.object({
    phone: z.string().trim().max(20),
    whatsapp: z.string().trim().max(20),
    email: optionalEmail,
  }),
  address: z.object({
    line1: z.string().trim().max(200),
    line2: z.string().trim().max(200),
    city: z.string().trim().max(100),
    state: z.string().trim().max(100),
    pincode: z.string().trim().max(12),
    country: z.string().trim().max(2, 'Use a 2-letter country code, e.g. IN'),
  }),
  socials: z.object({ instagram: z.string().trim().max(300), facebook: z.string().trim().max(300) }),
  businessHours: z
    .array(z.object({ day: z.enum(WEEKDAYS), open: time, close: time, closed: z.boolean() }))
    .length(7),
  seo: z.object({
    title: z.string().trim().max(120),
    description: z.string().trim().max(300),
    ogImageUrl: z.string().trim().max(500),
  }),
  paymentSettings: z.object({
    codEnabled: z.boolean(),
    onlineEnabled: z.boolean(),
    payAtShopEnabled: z.boolean(),
    upiId: z.string().trim().max(100),
  }),
  shippingSettings: z.object({
    deliveryEnabled: z.boolean(),
    pickupEnabled: z.boolean(),
    flatRate: money,
    freeAbove: money,
  }),
});
export type ShopSettingsForm = z.infer<typeof shopSettingsSchema>;

const toMajor = (minor: number | null | undefined) => (minor == null ? '' : String(minor / 100));
const toMinor = (v: string) => Math.round(Number(v) * 100);

export function shopToForm(shop: ShopDto): ShopSettingsForm {
  const hoursByDay = new Map((shop.businessHours ?? []).map((h) => [h.day, h]));
  return {
    name: shop.name ?? '',
    tagline: shop.tagline ?? '',
    description: shop.description ?? '',
    businessType: shop.businessType,
    contact: { phone: shop.contact?.phone ?? '', whatsapp: shop.contact?.whatsapp ?? '', email: shop.contact?.email ?? '' },
    address: {
      line1: shop.address?.line1 ?? '', line2: shop.address?.line2 ?? '', city: shop.address?.city ?? '',
      state: shop.address?.state ?? '', pincode: shop.address?.pincode ?? '', country: shop.address?.country ?? 'IN',
    },
    socials: { instagram: shop.socials?.instagram ?? '', facebook: shop.socials?.facebook ?? '' },
    businessHours: WEEKDAYS.map((day) => {
      const h = hoursByDay.get(day);
      return { day, open: h?.open ?? '10:00', close: h?.close ?? '20:00', closed: h?.closed ?? false };
    }),
    seo: { title: shop.seo?.title ?? '', description: shop.seo?.description ?? '', ogImageUrl: shop.seo?.ogImageUrl ?? '' },
    paymentSettings: {
      codEnabled: shop.paymentSettings?.codEnabled ?? true,
      onlineEnabled: shop.paymentSettings?.onlineEnabled ?? false,
      payAtShopEnabled: shop.paymentSettings?.payAtShopEnabled ?? false,
      upiId: shop.paymentSettings?.upiId ?? '',
    },
    shippingSettings: {
      deliveryEnabled: shop.shippingSettings?.deliveryEnabled ?? true,
      pickupEnabled: shop.shippingSettings?.pickupEnabled ?? true,
      flatRate: toMajor(shop.shippingSettings?.flatRateMinor ?? 0),
      freeAbove: toMajor(shop.shippingSettings?.freeAboveMinor),
    },
  };
}

export function formToUpdate(v: ShopSettingsForm): UpdateShopInput {
  const { flatRate, freeAbove, ...shipping } = v.shippingSettings;
  return {
    name: v.name, tagline: v.tagline, description: v.description, businessType: v.businessType,
    contact: v.contact, address: v.address, socials: v.socials, businessHours: v.businessHours, seo: v.seo,
    paymentSettings: v.paymentSettings,
    shippingSettings: { ...shipping, flatRateMinor: flatRate ? toMinor(flatRate) : 0, freeAboveMinor: freeAbove ? toMinor(freeAbove) : null },
  };
}
