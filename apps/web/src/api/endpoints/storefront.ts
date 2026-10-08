import type { AnalyticsEventType } from '@vastra/shared';
import { api, http, type Unwrapped } from '@/api/client';
import type {
  CartPriceRequest,
  CreateEnquiryRequest,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PricedCart,
  PublicCatalogue,
  PublicCategory,
  PublicOffer,
  PublicProduct,
  PublicProductsQuery,
  PublicShop,
  StorefrontFacets,
  TrackedOrder,
} from '@/types/storefront';

const base = (slug: string) => `/storefront/${encodeURIComponent(slug)}`;

/** Serialises arrays as repeated keys (`colour=a&colour=b`) and drops empty values. */
export function toSearchString(query: PublicProductsQuery): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.set(k, String(v));
  }
  return sp.toString();
}

export const storefrontApi = {
  shop: async (slug: string) => (await api.get<PublicShop>(base(slug))).data,
  categories: async (slug: string) => (await api.get<PublicCategory[]>(`${base(slug)}/categories`)).data,
  products: (slug: string, query: PublicProductsQuery = {}) => {
    const qs = toSearchString(query);
    return api.get<PublicProduct[]>(`${base(slug)}/products${qs ? `?${qs}` : ''}`);
  },
  product: async (slug: string, productSlug: string) =>
    (await api.get<PublicProduct>(`${base(slug)}/products/${encodeURIComponent(productSlug)}`)).data,
  facets: async (slug: string) => (await api.get<StorefrontFacets>(`${base(slug)}/facets`)).data,
  catalogues: async (slug: string) => (await api.get<PublicCatalogue[]>(`${base(slug)}/catalogues`)).data,
  catalogue: async (slug: string, catalogueSlug: string) =>
    (await api.get<PublicCatalogue>(`${base(slug)}/catalogues/${encodeURIComponent(catalogueSlug)}`)).data,
  offers: async (slug: string) => (await api.get<PublicOffer[]>(`${base(slug)}/offers`)).data,
  priceCart: async (slug: string, body: CartPriceRequest) => (await api.post<PricedCart>(`${base(slug)}/cart/price`, body)).data,
  placeOrder: async (slug: string, body: PlaceOrderRequest) =>
    (await api.post<PlaceOrderResponse>(`${base(slug)}/orders`, body)).data,
  trackOrder: async (slug: string, body: { orderNumber: string; phone: string }) =>
    (await api.post<TrackedOrder>(`${base(slug)}/orders/track`, body)).data,
  createEnquiry: async (slug: string, body: CreateEnquiryRequest) =>
    (await api.post<{ id: string }>(`${base(slug)}/enquiries`, body)).data,
  verifyPayment: async (slug: string, body: { orderNumber: string; payload: unknown }) =>
    (await api.post<unknown>(`${base(slug)}/payments/verify`, body)).data,
};

export type ProductsResult = Unwrapped<PublicProduct[]>;

// ---- analytics (fire-and-forget) --------------------------------------------
function sessionId(): string | undefined {
  try {
    let id = sessionStorage.getItem('vastra-sid');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('vastra-sid', id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export interface TrackEventInput {
  type: AnalyticsEventType;
  productId?: string;
  catalogueId?: string;
  meta?: Record<string, unknown>;
}

/** Never throws, never awaited by UI. */
export function trackEvent(slug: string, event: TrackEventInput): void {
  if (!slug) return;
  try {
    void http.post(`${base(slug)}/events`, { ...event, sessionId: sessionId() }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
