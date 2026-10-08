/** DTOs for shop settings, subscription, staff and notifications (mirror apps/api module READMEs). */
import type {
  BillingInterval, BusinessType, ButtonStyle, CatalogueLayout, FeatureKey, LimitKey, NotificationChannel,
  NotificationType, Permission, PlanFeatures, PlanLimits, StaffRole, SubscriptionStatus, TemplateId, Weekday,
} from '@vastra/shared';

export interface UsageRow { key: LimitKey; used: number; limit: number | null; percent: number }

export interface BusinessHourDto { day: Weekday; open: string; close: string; closed: boolean }

export interface ShopDto {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  businessType: BusinessType;
  logoUrl?: string;
  coverUrl?: string;
  orderPrefix?: string;
  contact?: { phone?: string; email?: string; whatsapp?: string };
  address?: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country?: string };
  socials?: { instagram?: string; facebook?: string; youtube?: string; website?: string };
  businessHours?: BusinessHourDto[];
  theme?: { templateId: TemplateId; primaryColor?: string; buttonStyle?: ButtonStyle; catalogueLayout?: CatalogueLayout };
  seo?: { title?: string; description?: string; keywords?: string[]; ogImageUrl?: string };
  paymentSettings?: { codEnabled: boolean; onlineEnabled: boolean; payAtShopEnabled: boolean; upiId?: string };
  shippingSettings?: { deliveryEnabled: boolean; pickupEnabled: boolean; flatRateMinor: number; freeAboveMinor: number | null };
  notificationSettings?: {
    inApp: boolean; email: boolean; whatsapp: boolean; emailTo?: string; whatsappTo?: string; lowStockThreshold: number;
  };
  currency: string;
  status: string;
  usageSummary?: UsageRow[];
  subscription?: { planCode: string; planName: string; status: string; currentPeriodEnd: string | null };
}

/** PATCH /shop body. Nested objects are merged server-side. */
export interface UpdateShopInput {
  name?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  businessType?: BusinessType;
  contact?: { phone?: string; email?: string; whatsapp?: string };
  address?: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country?: string };
  socials?: { instagram?: string; facebook?: string; youtube?: string; website?: string };
  businessHours?: BusinessHourDto[];
  seo?: { title?: string; description?: string; keywords?: string[]; ogImageUrl?: string };
  theme?: { templateId?: TemplateId; primaryColor?: string; buttonStyle?: ButtonStyle; catalogueLayout?: CatalogueLayout };
  paymentSettings?: { codEnabled?: boolean; onlineEnabled?: boolean; payAtShopEnabled?: boolean; upiId?: string };
  shippingSettings?: { deliveryEnabled?: boolean; pickupEnabled?: boolean; flatRateMinor?: number; freeAboveMinor?: number | null };
  notificationSettings?: {
    inApp?: boolean; email?: boolean; whatsapp?: boolean; emailTo?: string; whatsappTo?: string; lowStockThreshold?: number;
  };
}

export interface TemplateMeta { id: TemplateId; name: string; tagline: string; previewColors: string[] }

// ---- subscription
export interface PlanDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMinor: Record<BillingInterval, number>;
  currency: string;
  trialDays: number;
  limits: PlanLimits;
  features: PlanFeatures;
  isPublic: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface SubscriptionDto {
  plan: PlanDto;
  status: SubscriptionStatus;
  storedStatus: SubscriptionStatus;
  isActive: boolean;
  interval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  limitOverrides?: Partial<PlanLimits> | null;
  features: PlanFeatures;
  usage: UsageRow[];
  pendingChange: { id: string; planId: string; interval: BillingInterval; amountMinor: number; currency: string; createdAt: string } | null;
}

export type ChangePlanResult =
  | { status: 'COMPLETED'; subscription: SubscriptionDto }
  | {
      status: 'PENDING_PAYMENT';
      changeId: string;
      provider: string;
      providerOrderId: string;
      amountMinor: number;
      currency: string;
      clientPayload: Record<string, unknown>;
    };

export type { FeatureKey };

// ---- staff
export interface StaffDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: 'ACTIVE' | 'DISABLED';
  invitePending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
export interface StaffPermissionsDto {
  permissions: Permission[];
  roles: Record<StaffRole, Permission[]>;
  assignableRoles: StaffRole[];
}
export interface InviteStaffInput { name: string; email: string; phone?: string; role: StaffRole }

// ---- notifications
export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channels: NotificationChannel[];
  read: boolean;
  readAt: string | null;
  createdAt: string;
}
export interface NotificationList { items: NotificationDto[]; unreadCount: number }
