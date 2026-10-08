/**
 * @vastra/shared — single source of truth for enums, constants and permission
 * maps used by BOTH the API and the web app. Never duplicate these elsewhere.
 */

// ---------------------------------------------------------------- roles
export const GLOBAL_ROLES = ['SUPER_ADMIN', 'SHOP_USER', 'CUSTOMER'] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const STAFF_ROLES = ['OWNER', 'MANAGER', 'SALES', 'INVENTORY', 'ORDER_MANAGER'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PERMISSIONS = [
  'products:read',
  'products:write',
  'products:delete',
  'categories:write',
  'inventory:read',
  'inventory:write',
  'orders:read',
  'orders:create',
  'orders:write',
  'customers:read',
  'customers:write',
  'enquiries:read',
  'enquiries:write',
  'catalogues:write',
  'offers:write',
  'analytics:read',
  'staff:manage',
  'settings:write',
  'subscription:manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER: PERMISSIONS.filter((p) => p !== 'subscription:manage' && p !== 'staff:manage'),
  SALES: ['products:read', 'orders:read', 'orders:create', 'customers:read', 'customers:write', 'enquiries:read', 'enquiries:write'],
  INVENTORY: ['products:read', 'products:write', 'inventory:read', 'inventory:write', 'categories:write'],
  ORDER_MANAGER: ['products:read', 'orders:read', 'orders:write', 'customers:read', 'enquiries:read', 'enquiries:write'],
};

// ---------------------------------------------------------------- shop
export const BUSINESS_TYPES = [
  'GARMENT_SHOP',
  'SAREE_SHOP',
  'BOUTIQUE',
  'MENS_WEAR',
  'WOMENS_WEAR',
  'KIDS_WEAR',
  'FOOTWEAR',
  'FASHION_STORE',
  'MIXED_CLOTHING_STORE',
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const SHOP_STATUSES = ['ACTIVE', 'SUSPENDED', 'PENDING'] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

export const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// ---------------------------------------------------------------- templates (premium storefront themes)
export const TEMPLATE_IDS = [
  'heritage-gold', // classic Indian heritage, deep maroon + gold, serif display
  'minimal-noir', // monochrome editorial, huge type, hairline borders
  'boutique-blush', // soft blush/rose, rounded, airy, feminine boutique
  'urban-street', // bold dark streetwear, neon accent, chunky grid
  'royal-silk', // regal royal-blue/emerald + gold foil, luxury saree house
  'modern-linen', // warm neutrals, natural linen, calm & airy lifestyle
  'festive-bloom', // vibrant festival colours, marigold/magenta, playful
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
export const DEFAULT_TEMPLATE_ID: TemplateId = 'heritage-gold';

export const pickRandomTemplateId = (): TemplateId => TEMPLATE_IDS[Math.floor(Math.random() * TEMPLATE_IDS.length)];

export const BUTTON_STYLES = ['rounded', 'pill', 'square'] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];

export const CATALOGUE_LAYOUTS = ['grid', 'masonry', 'list', 'editorial'] as const;
export type CatalogueLayout = (typeof CATALOGUE_LAYOUTS)[number];

// ---------------------------------------------------------------- products
export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_TYPES = ['GARMENT', 'SAREE'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const GENDERS = ['MEN', 'WOMEN', 'KIDS', 'UNISEX'] as const;
export type Gender = (typeof GENDERS)[number];

export const OCCASIONS = ['WEDDING', 'PARTY', 'CASUAL', 'FESTIVAL', 'OFFICE', 'TRADITIONAL'] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const FABRICS = ['COTTON', 'SILK', 'LINEN', 'GEORGETTE', 'CHIFFON', 'RAYON', 'VELVET', 'POLYESTER', 'DENIM', 'OTHER'] as const;
export type Fabric = (typeof FABRICS)[number];

export const SAREE_TYPES = ['BANARASI', 'KANJIVARAM', 'SILK', 'COTTON', 'GEORGETTE', 'CHIFFON', 'ORGANZA', 'DESIGNER', 'PRINTED'] as const;
export type SareeType = (typeof SAREE_TYPES)[number];

export const SAREE_WORK_TYPES = ['EMBROIDERY', 'ZARI', 'MIRROR', 'THREAD', 'STONE', 'PRINTED', 'HANDWORK'] as const;
export type SareeWorkType = (typeof SAREE_WORK_TYPES)[number];

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE'] as const;
export type StandardSize = (typeof STANDARD_SIZES)[number];

export const MEDIA_KINDS = ['IMAGE', 'VIDEO'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const SEASONS = ['SUMMER', 'WINTER', 'MONSOON', 'SPRING', 'ALL_SEASON'] as const;
export type Season = (typeof SEASONS)[number];

// ---------------------------------------------------------------- inventory
export const INVENTORY_TXN_TYPES = ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE'] as const;
export type InventoryTxnType = (typeof INVENTORY_TXN_TYPES)[number];

// ---------------------------------------------------------------- orders / payments
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed order status transitions. Enforced server-side. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_PICKUP', 'SHIPPED', 'CANCELLED'],
  READY_FOR_PICKUP: ['DELIVERED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};
/** Statuses after which stock must be restored. */
export const STOCK_RESTORING_STATUSES: readonly OrderStatus[] = ['CANCELLED', 'REJECTED'];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['ONLINE', 'COD', 'PAY_AT_SHOP'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DELIVERY_TYPES = ['DELIVERY', 'PICKUP'] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

// ---------------------------------------------------------------- enquiries / offers / catalogues
export const ENQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'RESPONDED', 'CLOSED'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const DISCOUNT_TYPES = ['PERCENT', 'FLAT', 'BUY_X_GET_Y'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

// ---------------------------------------------------------------- subscriptions
export const SUBSCRIPTION_STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_INTERVALS = ['MONTHLY', 'YEARLY'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/**
 * Every enforceable limit. `null` in a plan means UNLIMITED.
 * Limits are stored on SubscriptionPlan.limits and edited by Super Admin — NEVER hard-coded.
 */
export const LIMIT_KEYS = [
  'products',
  'images',
  'videos',
  'storageBytes',
  'customers',
  'ordersPerMonth',
  'staff',
  'catalogues',
] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];

export const FEATURE_KEYS = ['customDomain', 'whatsappIntegration', 'analytics', 'advancedAnalytics', 'apiAccess', 'customBranding', 'bulkImport', 'prioritySupport'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type PlanLimits = Record<LimitKey, number | null>;
export type PlanFeatures = Record<FeatureKey, boolean>;

// ---------------------------------------------------------------- notifications / analytics
export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  'ORDER_NEW',
  'ENQUIRY_NEW',
  'PAYMENT_RECEIVED',
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'ORDER_PLACED',
  'ORDER_CONFIRMED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'LIMIT_WARNING',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ANALYTICS_EVENT_TYPES = [
  'CATALOGUE_VIEW',
  'SHOP_VIEW',
  'PRODUCT_VIEW',
  'PRODUCT_SHARE',
  'WHATSAPP_CLICK',
  'ENQUIRY',
  'ADD_TO_CART',
  'CHECKOUT_START',
  'ORDER',
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

// ---------------------------------------------------------------- errors
export const ERROR_CODES = [
  'AUTH_REQUIRED',
  'INVALID_CREDENTIALS',
  'TOKEN_EXPIRED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'SHOP_NOT_FOUND',
  'SHOP_SUSPENDED',
  'SLUG_TAKEN',
  'PRODUCT_NOT_FOUND',
  'CATEGORY_NOT_FOUND',
  'CATALOGUE_NOT_FOUND',
  'INVALID_VARIANT',
  'OUT_OF_STOCK',
  'INSUFFICIENT_STOCK',
  'ORDER_NOT_FOUND',
  'INVALID_ORDER_TRANSITION',
  'PAYMENT_FAILED',
  'PAYMENT_METHOD_DISABLED',
  'COUPON_INVALID',
  'PRODUCT_LIMIT_REACHED',
  'IMAGE_LIMIT_REACHED',
  'VIDEO_LIMIT_REACHED',
  'STORAGE_LIMIT_REACHED',
  'CUSTOMER_LIMIT_REACHED',
  'ORDER_LIMIT_REACHED',
  'STAFF_LIMIT_REACHED',
  'CATALOGUE_LIMIT_REACHED',
  'FEATURE_NOT_IN_PLAN',
  'UPLOAD_INVALID_TYPE',
  'UPLOAD_TOO_LARGE',
  'CAPTCHA_REQUIRED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Maps a LimitKey to the error code thrown when it is exceeded. */
export const LIMIT_ERROR_CODES: Record<LimitKey, ErrorCode> = {
  products: 'PRODUCT_LIMIT_REACHED',
  images: 'IMAGE_LIMIT_REACHED',
  videos: 'VIDEO_LIMIT_REACHED',
  storageBytes: 'STORAGE_LIMIT_REACHED',
  customers: 'CUSTOMER_LIMIT_REACHED',
  ordersPerMonth: 'ORDER_LIMIT_REACHED',
  staff: 'STAFF_LIMIT_REACHED',
  catalogues: 'CATALOGUE_LIMIT_REACHED',
};

// ---------------------------------------------------------------- API envelope
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  meta?: PaginationMeta;
}
export interface ApiFailure {
  success: false;
  error: { code: ErrorCode | string; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

// ---------------------------------------------------------------- helpers
/** Money is stored as integer MINOR units (paise). Convert at the edges only. */
export const toMinor = (major: number): number => Math.round(major * 100);
export const fromMinor = (minor: number): number => minor / 100;

export const RESERVED_SHOP_SLUGS = [
  'admin', 'api', 'dashboard', 'login', 'register', 'pricing', 'about', 'contact', 'shop', 'catalogue',
  'super-admin', 'static', 'assets', 'www', 'app', 'support', 'help', 'terms', 'privacy',
] as const;
