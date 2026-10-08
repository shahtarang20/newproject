import { z } from 'zod';
import { BILLING_INTERVALS, FEATURE_KEYS, GLOBAL_ROLES, LIMIT_KEYS, SHOP_STATUSES, SUBSCRIPTION_STATUSES } from '@vastra/shared';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectId });

const pageQuery = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().max(60).optional(),
};
const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

// ------------------------------------------------------------------ shops
export const shopsListQuery = z.object({
  ...pageQuery,
  q: z.string().trim().max(100).optional(),
  status: z.enum(SHOP_STATUSES).optional(),
  planId: objectId.optional(),
  plan: z.string().trim().max(40).optional(), // plan code
});

export const shopStatusSchema = z
  .object({ status: z.enum(['ACTIVE', 'SUSPENDED']), reason: z.string().trim().min(3).max(500).optional() })
  .refine((v) => v.status !== 'SUSPENDED' || Boolean(v.reason), { message: 'A reason is required to suspend a shop', path: ['reason'] });

const limitValue = z.number().int().min(0).nullable();
export const shopLimitsSchema = z
  .object({
    /** key -> number (override) | null (unlimited). */
    limitOverrides: z.object(Object.fromEntries(LIMIT_KEYS.map((k) => [k, limitValue.optional()]))).strict().optional(),
    /** keys whose override should be removed (fall back to the plan value). */
    clearOverrides: z.array(z.enum(LIMIT_KEYS)).optional(),
  })
  .refine((v) => v.limitOverrides !== undefined || (v.clearOverrides?.length ?? 0) > 0, 'Nothing to update');

export const shopPlanSchema = z.object({
  planId: objectId,
  interval: z.enum(BILLING_INTERVALS).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  /** ISO date, or null for a non-expiring period. Omit to keep: free plan => null, paid => +1 interval from now. */
  currentPeriodEnd: isoDate.nullable().optional(),
  resetOverrides: z.boolean().optional(),
});

// ------------------------------------------------------------------ users
export const usersListQuery = z.object({
  ...pageQuery,
  q: z.string().trim().max(100).optional(),
  role: z.enum(GLOBAL_ROLES).optional(),
  active: boolQuery.optional(),
});
export const userUpdateSchema = z.object({ isActive: z.boolean() });

// ------------------------------------------------------------------ plans
const limitsFull = z.object(Object.fromEntries(LIMIT_KEYS.map((k) => [k, limitValue]))).strict();
const limitsPartial = z.object(Object.fromEntries(LIMIT_KEYS.map((k) => [k, limitValue.optional()]))).strict();
const featuresFull = z.object(Object.fromEntries(FEATURE_KEYS.map((k) => [k, z.boolean()]))).strict();
const featuresPartial = z.object(Object.fromEntries(FEATURE_KEYS.map((k) => [k, z.boolean().optional()]))).strict();
const priceMinor = z.object({ MONTHLY: z.number().int().min(0), YEARLY: z.number().int().min(0) });

export const planCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,29}$/, 'Use A-Z, 0-9 and _ (2-30 chars)'),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional(),
  priceMinor,
  currency: z.string().trim().toUpperCase().length(3).default('INR'),
  trialDays: z.number().int().min(0).max(365).default(0),
  limits: limitsFull,
  features: featuresFull,
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const planUpdateSchema = z
  .object({
    code: planCreateSchema.shape.code,
    name: planCreateSchema.shape.name,
    description: z.string().trim().max(500),
    priceMinor: z.object({ MONTHLY: z.number().int().min(0).optional(), YEARLY: z.number().int().min(0).optional() }),
    currency: planCreateSchema.shape.currency,
    trialDays: z.number().int().min(0).max(365),
    limits: limitsPartial,
    features: featuresPartial,
    isPublic: z.boolean(),
    isActive: z.boolean(),
    isDefault: z.boolean(),
    sortOrder: z.number().int(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const plansListQuery = z.object({ includeInactive: boolQuery.optional() });

// ------------------------------------------------------------------ subscriptions
export const subscriptionsListQuery = z.object({
  ...pageQuery,
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  planId: objectId.optional(),
  q: z.string().trim().max(100).optional(),
});

export const subscriptionUpdateSchema = z
  .object({
    status: z.enum(SUBSCRIPTION_STATUSES),
    interval: z.enum(BILLING_INTERVALS),
    currentPeriodEnd: isoDate.nullable(),
    trialEndsAt: isoDate.nullable(),
    cancelAtPeriodEnd: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

// ------------------------------------------------------------------ analytics / storage / settings / logs
export const analyticsQuery = z.object({ days: z.coerce.number().int().min(7).max(365).optional() });
export const storageQuery = z.object({ ...pageQuery, q: z.string().trim().max(100).optional() });

export const settingsSchema = z
  .object({
    maintenance: z.object({ enabled: z.boolean(), message: z.string().trim().max(300).optional() }),
    signupsEnabled: z.boolean(),
    featureFlags: z.record(z.string().regex(/^[A-Za-z][\w.-]{0,59}$/), z.boolean()),
    defaults: z.object({
      currency: z.string().trim().toUpperCase().length(3),
      trialDays: z.number().int().min(0).max(365),
      lowStockThreshold: z.number().int().min(0).max(100000),
    }).partial(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const logsQuery = z.object({
  ...pageQuery,
  shopId: objectId.optional(),
  userId: objectId.optional(),
  action: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(60).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
