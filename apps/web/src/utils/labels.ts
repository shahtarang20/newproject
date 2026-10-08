import type {
  BusinessType, DeliveryType, DiscountType, EnquiryStatus, Fabric, Gender, InventoryTxnType, LimitKey,
  Occasion, OrderStatus, PaymentMethod, PaymentStatus, ProductStatus, ProductType, SareeType, SareeWorkType,
  Season, StaffRole, SubscriptionStatus, ShopStatus, GlobalRole, Permission,
} from '@vastra/shared';

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  GARMENT_SHOP: 'Garment shop',
  SAREE_SHOP: 'Saree shop',
  BOUTIQUE: 'Boutique',
  MENS_WEAR: "Men's wear",
  WOMENS_WEAR: "Women's wear",
  KIDS_WEAR: 'Kids wear',
  FOOTWEAR: 'Footwear',
  FASHION_STORE: 'Fashion store',
  MIXED_CLOTHING_STORE: 'Mixed clothing store',
};
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', PROCESSING: 'Processing', READY_FOR_PICKUP: 'Ready for pickup',
  SHIPPED: 'Shipped', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REJECTED: 'Rejected',
};
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending', PAID: 'Paid', FAILED: 'Failed', REFUNDED: 'Refunded', COD: 'Cash on delivery',
};
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ONLINE: 'Online payment', COD: 'Cash on delivery', PAY_AT_SHOP: 'Pay at shop',
};
export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = { DELIVERY: 'Home delivery', PICKUP: 'Store pickup' };
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: 'Draft', ACTIVE: 'Active', OUT_OF_STOCK: 'Out of stock', ARCHIVED: 'Archived',
};
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = { GARMENT: 'Garment', SAREE: 'Saree' };
export const GENDER_LABELS: Record<Gender, string> = { MEN: 'Men', WOMEN: 'Women', KIDS: 'Kids', UNISEX: 'Unisex' };
export const OCCASION_LABELS: Record<Occasion, string> = {
  WEDDING: 'Wedding', PARTY: 'Party', CASUAL: 'Casual', FESTIVAL: 'Festival', OFFICE: 'Office', TRADITIONAL: 'Traditional',
};
export const FABRIC_LABELS: Record<Fabric, string> = {
  COTTON: 'Cotton', SILK: 'Silk', LINEN: 'Linen', GEORGETTE: 'Georgette', CHIFFON: 'Chiffon', RAYON: 'Rayon',
  VELVET: 'Velvet', POLYESTER: 'Polyester', DENIM: 'Denim', OTHER: 'Other',
};
export const SAREE_TYPE_LABELS: Record<SareeType, string> = {
  BANARASI: 'Banarasi', KANJIVARAM: 'Kanjivaram', SILK: 'Silk', COTTON: 'Cotton', GEORGETTE: 'Georgette',
  CHIFFON: 'Chiffon', ORGANZA: 'Organza', DESIGNER: 'Designer', PRINTED: 'Printed',
};
export const SAREE_WORK_LABELS: Record<SareeWorkType, string> = {
  EMBROIDERY: 'Embroidery', ZARI: 'Zari', MIRROR: 'Mirror work', THREAD: 'Thread work', STONE: 'Stone work',
  PRINTED: 'Printed', HANDWORK: 'Handwork',
};
export const SEASON_LABELS: Record<Season, string> = {
  SUMMER: 'Summer', WINTER: 'Winter', MONSOON: 'Monsoon', SPRING: 'Spring', ALL_SEASON: 'All season',
};
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: 'Owner', MANAGER: 'Manager', SALES: 'Sales', INVENTORY: 'Inventory', ORDER_MANAGER: 'Order manager',
};
export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  SUPER_ADMIN: 'Super admin', SHOP_USER: 'Shop user', CUSTOMER: 'Customer',
};
export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: 'New', IN_PROGRESS: 'In progress', RESPONDED: 'Responded', CLOSED: 'Closed',
};
export const INVENTORY_TXN_LABELS: Record<InventoryTxnType, string> = {
  PURCHASE: 'Purchase', SALE: 'Sale', RETURN: 'Return', ADJUSTMENT: 'Adjustment', DAMAGE: 'Damage',
};
export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENT: 'Percentage off', FLAT: 'Flat amount off', BUY_X_GET_Y: 'Buy X get Y',
};
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: 'Trial', ACTIVE: 'Active', PAST_DUE: 'Past due', CANCELLED: 'Cancelled', EXPIRED: 'Expired',
};
export const SHOP_STATUS_LABELS: Record<ShopStatus, string> = { ACTIVE: 'Active', SUSPENDED: 'Suspended', PENDING: 'Pending' };
export const LIMIT_LABELS: Record<LimitKey, string> = {
  products: 'products', images: 'images', videos: 'videos', storageBytes: 'storage', customers: 'customers',
  ordersPerMonth: 'orders this month', staff: 'staff members', catalogues: 'catalogues',
};
export const PERMISSION_LABELS: Record<Permission, string> = {
  'products:read': 'View products', 'products:write': 'Edit products', 'products:delete': 'Delete products',
  'categories:write': 'Manage categories', 'inventory:read': 'View inventory', 'inventory:write': 'Adjust inventory',
  'orders:read': 'View orders', 'orders:create': 'Create orders', 'orders:write': 'Manage orders',
  'customers:read': 'View customers', 'customers:write': 'Edit customers', 'enquiries:read': 'View enquiries',
  'enquiries:write': 'Respond to enquiries', 'catalogues:write': 'Manage catalogues', 'offers:write': 'Manage offers',
  'analytics:read': 'View analytics', 'staff:manage': 'Manage staff', 'settings:write': 'Edit settings',
  'subscription:manage': 'Manage subscription',
};

/** Turn an enum map into `{value,label}[]` for selects. */
export function toOptions<T extends string>(map: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
export function labelOf<T extends string>(map: Record<T, string>, value: T | string | undefined | null): string {
  if (!value) return '—';
  return (map as Record<string, string>)[value] ?? value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
