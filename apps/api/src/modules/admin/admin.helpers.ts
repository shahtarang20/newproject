import { Types } from 'mongoose';
import { FEATURE_KEYS, LIMIT_KEYS, type LimitKey, type PlanFeatures, type PlanLimits } from '@vastra/shared';
import type { IShopUsage } from '@/database/models/shop.model';
import type { ISubscriptionPlan } from '@/database/models/subscription-plan.model';

export const LIMIT_TO_USAGE: Record<LimitKey, Exclude<keyof IShopUsage, 'periodStart'>> = {
  products: 'products',
  images: 'images',
  videos: 'videos',
  storageBytes: 'storageBytes',
  customers: 'customers',
  ordersPerMonth: 'ordersThisPeriod',
  staff: 'staff',
  catalogues: 'catalogues',
};

export const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);

/** plan.limits overlaid with per-shop overrides (key present with null = unlimited) — mirrors limits.service. */
export function effectiveLimits(plan: Pick<ISubscriptionPlan, 'limits'> | null | undefined, overrides?: Partial<PlanLimits>): PlanLimits {
  const limits = Object.fromEntries(LIMIT_KEYS.map((k) => [k, plan?.limits?.[k] ?? null])) as PlanLimits;
  for (const k of LIMIT_KEYS) {
    const v = overrides?.[k];
    if (v !== undefined) limits[k] = v;
  }
  return limits;
}

export interface UsageRow {
  key: LimitKey;
  used: number;
  limit: number | null;
  percent: number;
}

export function usageRows(usage: IShopUsage | undefined, limits: PlanLimits): UsageRow[] {
  return LIMIT_KEYS.map((key) => {
    const used = usage?.[LIMIT_TO_USAGE[key]] ?? 0;
    const limit = limits[key] ?? null;
    const percent = limit === null ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
    return { key, used, limit, percent };
  });
}

export const featuresOf = (plan: Pick<ISubscriptionPlan, 'features'> | null | undefined): PlanFeatures =>
  Object.fromEntries(FEATURE_KEYS.map((k) => [k, Boolean(plan?.features?.[k])])) as PlanFeatures;

export const planBrief = (p: ISubscriptionPlan | undefined | null) => (p ? { id: String(p._id), code: p.code, name: p.name } : null);

export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
