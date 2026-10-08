/** DTOs for dashboard, analytics, customers and enquiries. Money = integer minor units. */
import type { AnalyticsEventType, EnquiryStatus, OrderStatus, PaymentMethod, PaymentStatus } from '@vastra/shared';

export type DashboardRange = '7d' | '30d' | '90d';
export type AnalyticsRange = '7d' | '30d' | '90d' | '365d';
export type SalesGroupBy = 'day' | 'week' | 'month';

export interface DashboardData {
  range: DashboardRange;
  currency: string;
  from: string;
  to: string;
  todaySalesMinor: number;
  todayOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  productsCount: number;
  /** Variants in stock but at/below their threshold (same definition as the Inventory page). */
  lowStockCount: number;
  outOfStockCount: number;
  revenue: {
    totalMinor: number;
    previousMinor: number;
    deltaPercent: number | null;
    orders: number;
    previousOrders: number;
    ordersDeltaPercent: number | null;
  };
  topProducts: { productId: string; name: string; imageUrl?: string; quantity: number; revenueMinor: number; orders: number }[];
  recentOrders: {
    id: string; orderNumber: string; customerName: string; totalMinor: number; status: OrderStatus; paymentStatus: PaymentStatus; createdAt: string;
  }[];
  recentEnquiries: { id: string; name: string; phone: string; message: string; status: EnquiryStatus; productId: string | null; createdAt: string }[];
  salesOverTime: { date: string; revenueMinor: number }[];
  ordersOverTime: { date: string; orders: number }[];
  topCategories: { categoryId: string | null; name: string; revenueMinor: number; quantity: number }[];
}

export interface SalesAnalytics {
  groupBy: SalesGroupBy;
  from: string;
  to: string;
  series: { date: string; revenueMinor: number; orders: number }[];
  totals: {
    revenueMinor: number; orders: number; averageOrderValueMinor: number; previousRevenueMinor: number; previousOrders: number;
    revenueDeltaPercent: number | null; ordersDeltaPercent: number | null;
  };
  paymentMethodSplit: { method: PaymentMethod; orders: number; revenueMinor: number }[];
  statusSplit: { status: OrderStatus; orders: number; revenueMinor: number }[];
}

export type ProductSort = 'views' | 'addToCart' | 'orders' | 'revenue' | 'quantity';
export interface ProductPerformanceRow {
  productId: string; name: string; imageUrl?: string; views: number; addToCart: number; orders: number; quantity: number;
  revenueMinor: number; conversionPercent: number;
}
export interface ProductPerformance {
  items: ProductPerformanceRow[];
  from: string;
  to: string;
}

export interface FunnelData {
  from: string;
  to: string;
  funnel: {
    step: AnalyticsEventType;
    count: number;
    conversionFromPreviousPercent: number | null;
    conversionFromStartPercent: number;
  }[];
  engagement: { SHOP_VIEW: number; WHATSAPP_CLICK: number; PRODUCT_SHARE: number; ENQUIRY: number };
}

export interface ShopUsageData {
  usage: { key: import('@vastra/shared').LimitKey; used: number; limit: number | null; percent: number }[];
  storage: { usedBytes: number; limitBytes: number | null; percent: number };
}

// ---------------------------------------------------------------- customers
export type CustomerSource = 'ORDER' | 'ENQUIRY' | 'MANUAL' | 'ACCOUNT';
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  notes?: string;
  source: CustomerSource;
  isBlocked: boolean;
  hasAccount: boolean;
  stats: { ordersCount: number; totalSpentMinor: number; lastOrderAt?: string | null };
  createdAt: string;
  updatedAt: string;
}
export type CustomerSort = 'newest' | 'totalSpent' | 'lastOrderAt' | 'name';
export interface CustomerListQuery {
  q?: string;
  tag?: string;
  sort?: CustomerSort;
  dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
export interface CustomerProductStat {
  productId: string; name: string; imageUrl?: string; quantity: number; spentMinor: number; ordersCount: number; lastPurchasedAt: string;
}
export interface CustomerAddress {
  id?: string; label?: string; isDefault: boolean; name: string; phone: string; line1: string; line2?: string; landmark?: string;
  city: string; state: string; pincode: string; country: string; source: 'SAVED' | 'ORDER';
}
export interface CustomerDetail {
  customer: Customer;
  orderStats: { ordersCount: number; cancelledCount: number; totalSpentMinor: number; averageOrderMinor: number; lastOrderAt?: string | null };
  recentOrders: {
    id: string; orderNumber: string; status: OrderStatus; paymentStatus: PaymentStatus; paymentMethod: PaymentMethod; totalMinor: number;
    currency: string; itemCount: number; createdAt: string;
  }[];
  enquiries: { id: string; message: string; status: EnquiryStatus; productId?: string; respondedAt?: string; createdAt: string }[];
  purchasedProducts: CustomerProductStat[];
  favouriteProducts: CustomerProductStat[];
  addresses: CustomerAddress[];
}
export interface CreateCustomerPayload { name: string; phone: string; email?: string; notes?: string; tags?: string[] }
export interface UpdateCustomerPayload { name?: string; email?: string | null; notes?: string | null; tags?: string[]; isBlocked?: boolean }

// ---------------------------------------------------------------- enquiries
export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  status: EnquiryStatus;
  source: string;
  customerId?: string;
  product?: { id: string; name: string; slug: string; imageUrl?: string };
  response?: string;
  notes?: { text: string; at: string }[];
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface EnquiryStats {
  counts: Record<EnquiryStatus, number>;
  total: number;
  unreadNew: number;
}
export interface EnquiryListQuery { status?: EnquiryStatus | 'ALL'; q?: string; productId?: string; page?: number; limit?: number }
