import crypto from 'crypto';
import type { Types } from 'mongoose';
import type { GlobalRole } from '@vastra/shared';
import { env } from '@/config/env';
import { addDays, addMonths, startOfUtcDay } from '@/common/utils/date';
import { Shop, type IShop } from '@/database/models/shop.model';
import { ShopStaff } from '@/database/models/shop-staff.model';
import { SubscriptionPlan, type ISubscriptionPlan } from '@/database/models/subscription-plan.model';
import { Subscription } from '@/database/models/subscription.model';
import { User } from '@/database/models/user.model';
import { ensureDefaultPlan } from '@/modules/subscriptions/plan.bootstrap';
import { PLAN_SEEDS } from '@/modules/subscriptions/plan.defaults';
import { hashPassword, normaliseEmail } from '@/modules/users/user.service';
import type { ShopDef } from '../types';
import { imageUrl } from '../util';

export interface Credential { label: string; email: string; password: string; generated: boolean }

export interface Credentials {
  superAdmin: Credential;
  owner: Credential;
  customer: Credential;
  /** Owners 2 and 3 share the owner password; emails are derived (owner2@..., owner3@...). */
  ownerEmail: (key: ShopDef['ownerEmailKey']) => string;
}

function resolve(label: string, email: string, configured: string | undefined): Credential {
  const password = configured?.trim() ? configured : `${crypto.randomBytes(9).toString('base64url')}a1`;
  return { label, email: normaliseEmail(email), password, generated: !configured?.trim() };
}

/** Passwords come from env; when empty a random one is generated (and printed once by the runner). Never hardcoded. */
export function resolveCredentials(): Credentials {
  const owner = resolve('Shop owner', env.SEED_SHOP_OWNER_EMAIL, env.SEED_SHOP_OWNER_PASSWORD);
  const [local, domain] = owner.email.split('@');
  return {
    superAdmin: resolve('Super admin', env.SEED_SUPER_ADMIN_EMAIL, env.SEED_SUPER_ADMIN_PASSWORD),
    owner,
    customer: resolve('Customer', env.SEED_CUSTOMER_EMAIL, env.SEED_CUSTOMER_PASSWORD),
    ownerEmail: (key) => (key === 'owner' ? owner.email : `${local}${key === 'owner2' ? '2' : '3'}@${domain}`),
  };
}

/** FREE/STARTER/PRO/BUSINESS via ensureDefaultPlan; creates the demo PRO plan if it is missing from a customised plans table. */
export async function ensurePlans(): Promise<ISubscriptionPlan> {
  await ensureDefaultPlan();
  const existing = await SubscriptionPlan.findOne({ code: 'PRO' }).lean();
  if (existing) return existing;
  const seed = PLAN_SEEDS.find((p) => p.code === 'PRO');
  if (!seed) throw new Error('PRO plan seed definition missing');
  const created = await SubscriptionPlan.create({ ...seed, currency: 'INR', isActive: true });
  return created.toObject();
}

export interface UserInput { email: string; name: string; phone?: string; role: GlobalRole; password: string; shopId?: Types.ObjectId | null }

export async function upsertUser(input: UserInput): Promise<Types.ObjectId> {
  const now = new Date();
  const doc = await User.findOneAndUpdate(
    { email: normaliseEmail(input.email) },
    {
      $set: {
        name: input.name, phone: input.phone, role: input.role, passwordHash: await hashPassword(input.password), shopId: input.shopId ?? null,
        isActive: true, emailVerifiedAt: now, passwordChangedAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  if (!doc) throw new Error(`Failed to upsert user ${input.email}`);
  return doc._id;
}

const HOURS = [
  { day: 'MONDAY', closed: false }, { day: 'TUESDAY', closed: false }, { day: 'WEDNESDAY', closed: false }, { day: 'THURSDAY', closed: false },
  { day: 'FRIDAY', closed: false }, { day: 'SATURDAY', closed: false }, { day: 'SUNDAY', closed: true },
] as const;

/** Upserts the Shop on its slug (stable key), its OWNER ShopStaff row and its Subscription on the PRO plan. */
export async function upsertShopWithSubscription(def: ShopDef, ownerId: Types.ObjectId, ownerEmail: string, plan: ISubscriptionPlan, now: Date): Promise<IShop> {
  const periodStart = startOfUtcDay(addDays(now, -12));
  const fields = {
    name: def.name, tagline: def.tagline, description: def.description, businessType: def.businessType, orderPrefix: def.prefix, ownerId, status: 'ACTIVE',
    logoUrl: imageUrl(`${def.slug}-logo`, 256, 256), coverUrl: imageUrl(`${def.slug}-cover`, 1600, 600),
    contact: { phone: def.contactPhone, email: def.contactEmail, whatsapp: def.contactPhone },
    address: { ...def.address, country: 'IN' },
    socials: { instagram: def.instagram },
    businessHours: HOURS.map((h) => ({ day: h.day, open: '10:00', close: '20:30', closed: h.closed })),
    theme: { templateId: def.templateId, primaryColor: def.primaryColor, buttonStyle: def.buttonStyle, catalogueLayout: 'grid' },
    seo: { title: `${def.name} | ${def.tagline}`, description: def.description.slice(0, 155), keywords: def.seoKeywords },
    paymentSettings: { codEnabled: true, onlineEnabled: false, payAtShopEnabled: true, upiId: def.upiId },
    shippingSettings: { deliveryEnabled: true, pickupEnabled: true, flatRateMinor: def.flatRateMinor, freeAboveMinor: def.freeAboveMinor },
    notificationSettings: { inApp: true, email: true, whatsapp: false, emailTo: ownerEmail, lowStockThreshold: 5 },
    currency: 'INR',
  };
  const shop = await Shop.findOneAndUpdate({ slug: def.slug }, { $set: fields }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  if (!shop) throw new Error(`Failed to upsert shop ${def.slug}`);

  await ShopStaff.findOneAndUpdate({ shopId: shop._id, userId: ownerId }, { $set: { role: 'OWNER', status: 'ACTIVE' } }, { upsert: true, new: true });
  const sub = await Subscription.findOneAndUpdate(
    { shopId: shop._id },
    {
      $set: {
        planId: plan._id, status: 'ACTIVE', interval: 'MONTHLY', currentPeriodStart: periodStart, currentPeriodEnd: addMonths(periodStart, 1),
        trialEndsAt: null, cancelAtPeriodEnd: false, limitOverrides: {},
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  if (!sub) throw new Error(`Failed to upsert subscription for ${def.slug}`);
  await Shop.updateOne({ _id: shop._id }, { $set: { subscriptionId: sub._id } });
  await User.updateOne({ _id: ownerId }, { $set: { shopId: shop._id } });
  return { ...shop, subscriptionId: sub._id, usage: { ...shop.usage, periodStart } };
}
