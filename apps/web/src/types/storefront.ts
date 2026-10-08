/**
 * Public (customer-facing) DTOs returned by `/api/storefront/:slug/*`.
 * The API storefront module MUST return exactly these shapes. Money = integer minor units (paise).
 */
import type {
  ButtonStyle,
  CatalogueLayout,
  Gender,
  PaymentMethod,
  ProductType,
  TemplateId,
  Weekday,
} from '@vastra/shared';

export interface PublicBusinessHour {
  day: Weekday;
  open: boolean;
  openTime?: string; // 'HH:mm'
  closeTime?: string;
}

export interface PublicShop {
  id: string;
  slug: string;
  name: string;
  description?: string;
  businessType: string;
  logoUrl?: string;
  coverUrl?: string;
  address: { line1?: string; line2?: string; city?: string; state?: string; country?: string; pincode?: string };
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  businessHours: PublicBusinessHour[];
  currency: string;
  theme: {
    templateId: TemplateId;
    primaryColor?: string;
    buttonStyle: ButtonStyle;
    catalogueLayout: CatalogueLayout;
  };
  payment: { codEnabled: boolean; onlineEnabled: boolean; payAtShopEnabled: boolean };
  seo?: { title?: string; description?: string; ogImageUrl?: string };
  whatsappEnabled: boolean;
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  parentId?: string | null;
  productCount?: number;
}

export interface PublicMedia {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  url: string;
  thumbUrl?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  alt?: string;
  isPrimary?: boolean;
}

export interface PublicVariant {
  id: string;
  sku: string;
  colour?: string;
  colourHex?: string;
  size?: string;
  priceMinor: number;
  mrpMinor?: number;
  inStock: boolean;
  /** Exact stock only when low (<= lowStockThreshold), else undefined. */
  stockLeft?: number;
  imageUrl?: string;
}

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  sku?: string;
  description?: string;
  type: ProductType;
  brand?: string;
  gender?: Gender;
  fabric?: string;
  occasion?: string[];
  tags?: string[];
  category?: { id: string; name: string; slug: string };
  media: PublicMedia[];
  primaryImageUrl?: string;
  primaryThumbUrl?: string;
  price: {
    sellingMinor?: number; // lowest variant price
    maxSellingMinor?: number;
    mrpMinor?: number;
    discountPercent?: number;
    hidden: boolean; // "Contact shop for price"
  };
  colours: { name: string; hex?: string }[];
  sizes: string[];
  variants: PublicVariant[];
  inStock: boolean;
  lowStock: boolean;
  offerBadge?: string;
  sareeAttrs?: {
    sareeType?: string;
    length?: string;
    blouseIncluded?: boolean;
    blouseLength?: string;
    workTypes?: string[];
    borderType?: string;
    pattern?: string;
    washCare?: string;
  };
  garmentAttrs?: {
    fit?: string;
    sleeveType?: string;
    neckType?: string;
    pattern?: string;
    washCare?: string;
  };
  seo?: { title?: string; description?: string };
  createdAt: string;
}

export interface PublicCatalogue {
  id: string;
  slug: string;
  name: string;
  description?: string;
  coverUrl?: string;
  productCount: number;
  startDate?: string;
  endDate?: string;
}

export interface PublicOffer {
  id: string;
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  couponCode?: string;
  minOrderMinor?: number;
  endDate?: string;
}

export interface StorefrontFacets {
  colours: { name: string; hex?: string; count: number }[];
  sizes: { name: string; count: number }[];
  fabrics: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  occasions: { name: string; count: number }[];
  categories: PublicCategory[];
  price: { minMinor: number; maxMinor: number };
}

export interface PublicProductsQuery {
  q?: string;
  category?: string;
  catalogue?: string;
  colour?: string[];
  size?: string[];
  fabric?: string[];
  brand?: string[];
  occasion?: string[];
  gender?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onOffer?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'discount';
  page?: number;
  limit?: number;
}

/** Cart pricing request/response (server is authoritative). */
export interface CartPriceRequest {
  items: { productId: string; variantId: string; quantity: number }[];
  couponCode?: string;
}
export interface PricedCartLine {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  imageUrl?: string;
  colour?: string;
  size?: string;
  sku: string;
  unitPriceMinor: number;
  mrpMinor?: number;
  quantity: number;
  lineTotalMinor: number;
  available: boolean;
  maxQuantity: number;
  issue?: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'UNAVAILABLE' | 'PRICE_HIDDEN';
}
export interface PricedCart {
  lines: PricedCartLine[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  coupon?: { code: string; valid: boolean; message?: string };
  currency: string;
}

export interface PlaceOrderRequest {
  items: { productId: string; variantId: string; quantity: number }[];
  couponCode?: string;
  customer: { name: string; phone: string; email?: string };
  deliveryType: 'DELIVERY' | 'PICKUP';
  address?: { line1: string; line2?: string; city: string; state: string; pincode: string; country?: string; landmark?: string };
  paymentMethod: PaymentMethod;
  notes?: string;
  /** honeypot — must stay empty */
  website?: string;
}
export interface PlaceOrderResponse {
  orderNumber: string;
  orderId: string;
  totalMinor: number;
  paymentStatus: string;
  status: string;
  /** present for ONLINE payments */
  payment?: { provider: string; providerOrderId: string; clientPayload: Record<string, unknown> };
}

export interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  totalMinor: number;
  currency: string;
  createdAt: string;
  items: { name: string; colour?: string; size?: string; quantity: number; unitPriceMinor: number; imageUrl?: string }[];
  timeline: { status: string; at: string; note?: string }[];
}

export interface CreateEnquiryRequest {
  customerName: string;
  phone: string;
  productId?: string;
  variantId?: string;
  question: string;
  website?: string;
}
