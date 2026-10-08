/** Super-admin DTOs mirroring apps/api/src/modules/admin (README.md). Money = integer minor units. */
import type {
  BillingInterval, BusinessType, GlobalRole, LimitKey, PaginationMeta, PlanFeatures, PlanLimits, ShopStatus, StaffRole, SubscriptionStatus,
} from '@vastra/shared';
import type { UsageItem } from './api';

export interface Paged<T> {
  items: T[];
  meta?: PaginationMeta;
}

export interface PlanBrief {
  id: string;
  code: string;
  name: string;
}

// ------------------------------------------------------------------ shops
export interface AdminShopListItem {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
  businessType?: BusinessType;
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  plan: PlanBrief | null;
  subscriptionStatus: SubscriptionStatus | null;
  usage: UsageItem[];
}

export interface AdminShopDoc {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
  businessType?: BusinessType;
  currency?: string;
  description?: string;
  createdAt?: string;
  contact?: { email?: string; phone?: string; whatsapp?: string };
  [key: string]: unknown;
}

export interface AdminSubscription {
  id: string;
  plan: PlanBrief | null;
  status: SubscriptionStatus;
  storedStatus: SubscriptionStatus;
  interval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  limitOverrides: Partial<PlanLimits>;
}

export interface AdminShopDetail {
  shop: AdminShopDoc;
  owner: { id: string; name: string; email: string; phone: string | null; isActive: boolean; lastLoginAt: string | null } | null;
  subscription: AdminSubscription | null;
  /** Effective limits (plan + overrides). */
  limits: PlanLimits;
  features: PlanFeatures;
  usage: UsageItem[];
  counts: { products: number; orders: number };
  /** Only present on the assign-plan response. */
  overLimit?: LimitKey[];
}

export interface ShopsQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  planId?: string;
}

export interface ShopLimitsPayload {
  limitOverrides?: Partial<Record<LimitKey, number | null>>;
  clearOverrides?: LimitKey[];
}

export interface ShopPlanPayload {
  planId: string;
  interval?: BillingInterval;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  resetOverrides?: boolean;
}

// ------------------------------------------------------------------ users
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: GlobalRole;
  isActive: boolean;
  shopId?: string | null;
  shop: { id: string; name: string; slug: string } | null;
  lastLoginAt?: string | null;
  createdAt: string;
  memberships?: Array<{ shopId: string; shopName: string; shopSlug: string; role: StaffRole; status: string }>;
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  active?: boolean;
}

// ------------------------------------------------------------------ plans
export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  priceMinor: { MONTHLY: number; YEARLY: number };
  currency: string;
  trialDays: number;
  limits: PlanLimits;
  features: PlanFeatures;
  isPublic: boolean;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  shopCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanInput {
  code?: string;
  name: string;
  description?: string;
  priceMinor: { MONTHLY: number; YEARLY: number };
  currency: string;
  trialDays: number;
  limits: PlanLimits;
  features: PlanFeatures;
  isPublic: boolean;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
}

// ------------------------------------------------------------------ subscriptions
export interface AdminSubscriptionRow {
  id: string;
  shop: { id: string; name: string; slug: string; status: ShopStatus } | null;
  plan: PlanBrief | null;
  status: SubscriptionStatus;
  storedStatus: SubscriptionStatus;
  interval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  limitOverrides: Partial<PlanLimits>;
  createdAt: string;
}

export interface SubscriptionsQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  planId?: string;
}

export interface SubscriptionPatch {
  status?: SubscriptionStatus;
  interval?: BillingInterval;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean;
}

// ------------------------------------------------------------------ analytics / storage
export interface DailyCount {
  date: string;
  count: number;
}

export interface AdminAnalytics {
  totals: {
    shops: number;
    activeShops: number;
    suspendedShops: number;
    users: number;
    products: number;
    orders: number;
    gmvMinor: number;
    mrrMinor: number;
    payingShops: number;
  };
  rangeDays: number;
  signups: { shops: DailyCount[]; users: DailyCount[] };
  topShops: Array<{ shopId: string; name: string; slug: string | null; gmvMinor: number; orders: number }>;
  shopsNearLimits: Array<{
    shopId: string;
    name: string;
    slug: string;
    plan: PlanBrief | null;
    keys: UsageItem[];
    maxPercent: number;
  }>;
}

export interface StorageItem {
  shopId: string;
  name: string;
  slug: string;
  status: ShopStatus;
  plan: PlanBrief | null;
  usedBytes: number;
  limitBytes: number | null;
  percent: number;
  images: number;
  videos: number;
}

export interface AdminStorage {
  items: StorageItem[];
  totals: { usedBytes: number; images: number; videos: number; products: number; shops: number };
  topConsumers: Array<{ shopId: string; name: string; slug: string; usedBytes: number }>;
  meta?: PaginationMeta;
}

// ------------------------------------------------------------------ settings / logs
export interface PlatformSettings {
  maintenance?: { enabled: boolean; message?: string };
  signupsEnabled?: boolean;
  featureFlags?: Record<string, boolean>;
  defaults?: { currency?: string; trialDays?: number; lowStockThreshold?: number };
  [key: string]: unknown;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
  ip?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  shop: { id: string; name: string; slug: string } | null;
}

export interface LogsQuery {
  page?: number;
  limit?: number;
  shopId?: string;
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: string;
  to?: string;
}
