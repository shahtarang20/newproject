/** DTOs mirroring the API (authenticated areas). Money = integer minor units. */
import type {
  BusinessType,
  GlobalRole,
  LimitKey,
  Permission,
  ShopStatus,
  StaffRole,
  TemplateId,
} from '@vastra/shared';

export type { PaginationMeta } from '@vastra/shared';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: GlobalRole;
  avatarUrl?: string;
}

export interface AuthShop {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  currency: string;
  status: ShopStatus;
  businessType?: BusinessType;
  theme?: { templateId: TemplateId };
}

/** Returned by register / login / refresh. */
export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  shop?: AuthShop | null;
  staffRole?: StaffRole | null;
  permissions?: Permission[];
}

/** Returned by GET /auth/me. */
export interface MeResponse {
  user: AuthUser;
  shop?: AuthShop | null;
  staffRole?: StaffRole | null;
  permissions?: Permission[];
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  shopName: string;
  shopSlug: string;
  businessType: BusinessType;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UsageItem {
  key: LimitKey;
  used: number;
  limit: number | null;
  percent: number;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  [key: string]: string | number | boolean | undefined | string[];
}
