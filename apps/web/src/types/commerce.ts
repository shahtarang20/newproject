/** DTOs for orders / inventory / offers (shop-owner dashboard). Money = integer minor units. */
import type {
  DeliveryType, DiscountType, InventoryTxnType, OrderStatus, PaymentMethod, PaymentStatus, PaginationMeta,
} from '@vastra/shared';

export type { PaginationMeta };

// ------------------------------------------------------------------ orders
export interface OrderCustomerSnapshot {
  name: string;
  phone: string;
  email?: string;
  customerId?: string;
}

export interface OrderAddress {
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  name: string;
  sku?: string;
  colour?: string;
  size?: string;
  imageUrl?: string;
  unitPriceMinor: number;
  mrpMinor?: number;
  qty: number;
  discountMinor?: number;
  taxPercent?: number;
  taxMinor?: number;
  lineTotalMinor: number;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  at: string;
  by?: string;
  byLabel?: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerSnapshot: OrderCustomerSnapshot;
  items: OrderItem[];
  address?: OrderAddress | null;
  deliveryType?: DeliveryType;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  timeline?: OrderTimelineEntry[];
  customerNote?: string;
  internalNote?: string;
  cancelReason?: string;
  stockRestored?: boolean;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderStats {
  total: number;
  byStatus: Record<OrderStatus, number>;
  today: { orders: number; revenueMinor: number };
}

export interface OrderListQuery {
  status?: string; // comma list
  paymentStatus?: string;
  paymentMethod?: PaymentMethod;
  search?: string;
  from?: string;
  to?: string;
  sort?: 'createdAt' | '-createdAt' | 'totalMinor' | '-totalMinor';
  page?: number;
  limit?: number;
}

export interface CreateOrderPayload {
  items: { productId: string; variantId: string; quantity: number }[];
  couponCode?: string;
  customer: { name: string; phone: string; email?: string };
  deliveryType?: DeliveryType;
  address?: OrderAddress;
  paymentMethod: 'COD' | 'PAY_AT_SHOP';
  markPaid?: boolean;
  notes?: string;
}

export interface CreateOrderResponse {
  orderNumber: string;
  orderId: string;
  totalMinor: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}

// ------------------------------------------------------------------ product lookup (for pickers)
export interface LookupProduct {
  id: string;
  name: string;
  sku?: string;
  primaryThumbUrl?: string;
  primaryImageUrl?: string;
  status?: string;
  stockTotal?: number;
}
export interface LookupVariant {
  id: string;
  productId: string;
  sku: string;
  colour?: { name: string; hex?: string } | string | null;
  size?: string | null;
  sellingPriceMinor: number;
  stock: number;
  imageUrl?: string;
  isActive: boolean;
}
export interface LookupCategory { id: string; name: string; parentId?: string | null }

// ------------------------------------------------------------------ inventory
export type StockStatus = 'OK' | 'LOW' | 'OUT';
export interface InventoryItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug?: string;
  imageUrl?: string;
  sku: string;
  colour?: string | null;
  size?: string | null;
  stock: number;
  lowStockThreshold: number;
  status: StockStatus;
  sellingPriceMinor?: number;
}
export interface InventorySummary {
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
}
export interface InventoryListResult { items: InventoryItem[]; summary: InventorySummary }
export interface InventoryListQuery {
  filter?: 'all' | 'low' | 'out';
  q?: string;
  productId?: string;
  page?: number;
  limit?: number;
}
export type AdjustType = Exclude<InventoryTxnType, 'SALE'>;
export interface AdjustStockPayload {
  variantId: string;
  type: AdjustType;
  quantity: number;
  note?: string;
  unitCostMinor?: number;
}
export interface AdjustStockResult {
  variantId: string;
  productId: string;
  type: InventoryTxnType;
  delta: number;
  before: number;
  stock: number;
  transactionId: string;
}
export interface InventoryTransaction {
  id: string;
  type: InventoryTxnType;
  quantity: number; // signed
  balanceAfter: number;
  reason?: string;
  productId: string;
  productName: string;
  variantId: string;
  sku?: string;
  colour?: string | null;
  size?: string | null;
  orderId?: string;
  createdBy?: string;
  createdAt: string;
}
export interface TransactionsQuery {
  variantId?: string;
  productId?: string;
  type?: InventoryTxnType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ------------------------------------------------------------------ offers & coupons
export type OfferScope = 'ALL' | 'PRODUCTS' | 'CATEGORIES';
export interface Offer {
  id: string;
  name: string;
  description?: string;
  badgeText?: string;
  discountType: DiscountType;
  value: number;
  maxDiscountMinor?: number | null;
  buyQty?: number;
  getQty?: number;
  scope: OfferScope;
  productIds: string[];
  categoryIds: string[];
  minOrderMinor: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  createdAt?: string;
}
export interface OfferPayload {
  name: string;
  description?: string;
  badgeText?: string;
  discountType: DiscountType;
  value: number;
  maxDiscountMinor?: number | null;
  buyQty?: number;
  getQty?: number;
  scope: OfferScope;
  productIds: string[];
  categoryIds: string[];
  minOrderMinor: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}
export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  maxDiscountMinor?: number | null;
  minOrderMinor: number;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  usedCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  createdAt?: string;
}
export interface CouponPayload {
  code?: string; // create only
  description?: string;
  discountType: 'PERCENT' | 'FLAT';
  value: number;
  maxDiscountMinor?: number | null;
  minOrderMinor: number;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}
export type PromoState = 'active' | 'scheduled' | 'expired' | 'inactive';
