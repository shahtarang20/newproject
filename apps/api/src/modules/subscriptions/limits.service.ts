import { Types } from 'mongoose';
import {
  FEATURE_KEYS,
  LIMIT_ERROR_CODES,
  LIMIT_KEYS,
  type FeatureKey,
  type LimitKey,
  type PlanFeatures,
  type PlanLimits,
} from '@vastra/shared';
import { AppError, Errors } from '@/common/errors';
import { addMonths, monthsElapsed } from '@/common/utils/date';
import { Shop, type IShop, type IShopUsage } from '@/database/models/shop.model';
import { SubscriptionPlan, type ISubscriptionPlan } from '@/database/models/subscription-plan.model';
import { Subscription, type ISubscription } from '@/database/models/subscription.model';
import { ensureDefaultPlan } from './plan.bootstrap';

export type UsageKey = Exclude<keyof IShopUsage, 'periodStart'>;
/** Accepts limit keys (ordersPerMonth maps to usage.ordersThisPeriod) or raw usage keys. */
export type UsageInput = LimitKey | UsageKey;

export interface EffectiveLimits {
  limits: PlanLimits;
  features: PlanFeatures;
  plan: ISubscriptionPlan;
  subscription: ISubscription | null;
}

export interface UsageSummaryRow {
  key: LimitKey;
  used: number;
  /** null = unlimited */
  limit: number | null;
  /** 0-100, 0 when unlimited */
  percent: number;
}

const LIMIT_LABELS: Record<LimitKey, string> = {
  products: 'products',
  images: 'images',
  videos: 'videos',
  storageBytes: 'storage',
  customers: 'customers',
  ordersPerMonth: 'orders per month',
  staff: 'staff members',
  catalogues: 'catalogues',
};

const LIMIT_TO_USAGE: Record<LimitKey, UsageKey> = {
  products: 'products',
  images: 'images',
  videos: 'videos',
  storageBytes: 'storageBytes',
  customers: 'customers',
  ordersPerMonth: 'ordersThisPeriod',
  staff: 'staff',
  catalogues: 'catalogues',
};

const toUsageKey = (k: UsageInput): UsageKey => (k in LIMIT_TO_USAGE ? LIMIT_TO_USAGE[k as LimitKey] : (k as UsageKey));

const formatBytes = (n: number): string => {
  if (n >= 1024 ** 3) return `${+(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${+(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
};

const oid = (id: string | Types.ObjectId): Types.ObjectId => (typeof id === 'string' ? new Types.ObjectId(id) : id);

/** effective = plan.limits overlaid by subscription.limitOverrides (a key present with null = unlimited). */
export async function getEffectiveLimits(shopId: string | Types.ObjectId): Promise<EffectiveLimits> {
  const subscription = await Subscription.findOne({ shopId: oid(shopId) }).lean();
  let plan: ISubscriptionPlan | null = subscription ? await SubscriptionPlan.findById(subscription.planId).lean() : null;
  if (!plan) plan = await ensureDefaultPlan();

  const limits = { ...plan.limits } as PlanLimits;
  const overrides = (subscription?.limitOverrides ?? {}) as Partial<PlanLimits>;
  for (const key of LIMIT_KEYS) {
    const v = overrides[key];
    if (v !== undefined) limits[key] = v; // null is a valid override (unlimited)
  }
  const features = Object.fromEntries(FEATURE_KEYS.map((k) => [k, Boolean(plan.features?.[k])])) as PlanFeatures;
  return { limits, features, plan, subscription };
}

/** Rolls ordersThisPeriod over (atomically, once) when a month has elapsed since periodStart. Returns fresh usage. */
async function loadUsage(shopId: string | Types.ObjectId): Promise<IShopUsage> {
  const shop = await Shop.findById(oid(shopId)).select('usage').lean<Pick<IShop, 'usage'> | null>();
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  const usage = shop.usage;
  const elapsed = monthsElapsed(usage.periodStart);
  if (elapsed >= 1) {
    const newStart = addMonths(usage.periodStart, elapsed);
    // Conditional on the old periodStart so concurrent requests reset only once.
    const res = await Shop.updateOne(
      { _id: oid(shopId), 'usage.periodStart': usage.periodStart },
      { $set: { 'usage.ordersThisPeriod': 0, 'usage.periodStart': newStart } },
    );
    if (res.modifiedCount > 0) return { ...usage, ordersThisPeriod: 0, periodStart: newStart };
    const fresh = await Shop.findById(oid(shopId)).select('usage').lean<Pick<IShop, 'usage'> | null>();
    return fresh?.usage ?? usage;
  }
  return usage;
}

export async function assertWithinLimit(shopId: string | Types.ObjectId, key: LimitKey, increment = 1): Promise<void> {
  const { limits } = await getEffectiveLimits(shopId);
  const limit = limits[key];
  if (limit === null || limit === undefined) return;
  const usage = await loadUsage(shopId);
  const used = usage[LIMIT_TO_USAGE[key]];
  if (used + increment > limit) {
    const label = LIMIT_LABELS[key];
    const shown = key === 'storageBytes' ? formatBytes(limit) : String(limit);
    throw new AppError(
      403,
      LIMIT_ERROR_CODES[key],
      `Your plan allows ${shown} ${label}. You have reached your ${label} limit. Upgrade your plan to add more.`,
      { key, limit, used, requested: increment },
    );
  }
}

export async function assertFeature(shopId: string | Types.ObjectId, feature: FeatureKey): Promise<void> {
  const { features } = await getEffectiveLimits(shopId);
  if (!features[feature]) {
    throw new AppError(403, 'FEATURE_NOT_IN_PLAN', 'This feature is not available on your current plan. Upgrade your plan to use it.', { feature });
  }
}

export const assertStorage = (shopId: string | Types.ObjectId, bytes: number): Promise<void> => assertWithinLimit(shopId, 'storageBytes', bytes);

function normaliseDelta(key: UsageInput | Partial<Record<UsageInput, number>>, by: number): Array<[UsageKey, number]> {
  if (typeof key === 'string') return [[toUsageKey(key), by]];
  return (Object.entries(key) as Array<[UsageInput, number | undefined]>)
    .filter((e): e is [UsageInput, number] => typeof e[1] === 'number' && e[1] !== 0)
    .map(([k, n]) => [toUsageKey(k), n]);
}

/** Atomic `$inc` on Shop.usage. Orders counter rolls the period first. */
export async function incrementUsage(
  shopId: string | Types.ObjectId,
  key: UsageInput | Partial<Record<UsageInput, number>>,
  by = 1,
): Promise<void> {
  const deltas = normaliseDelta(key, by);
  if (!deltas.length) return;
  if (deltas.some(([k]) => k === 'ordersThisPeriod')) await loadUsage(shopId);
  const $inc = Object.fromEntries(deltas.map(([k, n]) => [`usage.${k}`, n]));
  await Shop.updateOne({ _id: oid(shopId) }, { $inc });
}

/** Atomic decrement, floored at 0. */
export async function decrementUsage(
  shopId: string | Types.ObjectId,
  key: UsageInput | Partial<Record<UsageInput, number>>,
  by = 1,
): Promise<void> {
  const deltas = normaliseDelta(key, by);
  if (!deltas.length) return;
  const $set = Object.fromEntries(deltas.map(([k, n]) => [`usage.${k}`, { $max: [0, { $subtract: [`$usage.${k}`, Math.abs(n)] }] }]));
  await Shop.updateOne({ _id: oid(shopId) }, [{ $set }]);
}

export async function getUsageSummary(shopId: string | Types.ObjectId): Promise<UsageSummaryRow[]> {
  const [{ limits }, usage] = await Promise.all([getEffectiveLimits(shopId), loadUsage(shopId)]);
  return LIMIT_KEYS.map((key) => {
    const used = usage[LIMIT_TO_USAGE[key]] ?? 0;
    const limit = limits[key] ?? null;
    const percent = limit === null ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
    return { key, used, limit, percent };
  });
}
