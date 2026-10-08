import { api } from '../client';
import type {
  CreateOrderPayload, CreateOrderResponse, LookupCategory, LookupProduct, LookupVariant, Order, OrderListQuery, OrderStats,
} from '@/types/commerce';
import type { OrderStatus } from '@vastra/shared';

export const ordersApi = {
  list: async (params: OrderListQuery) => {
    const res = await api.get<Order[]>('/orders', { params });
    return { items: res.data, meta: res.meta };
  },
  stats: async () => (await api.get<OrderStats>('/orders/stats')).data,
  get: async (id: string) => (await api.get<Order>(`/orders/${id}`)).data,
  create: async (body: CreateOrderPayload) => (await api.post<CreateOrderResponse>('/orders', body)).data,
  updateStatus: async (id: string, body: { status: OrderStatus; note?: string }) =>
    (await api.patch<Order>(`/orders/${id}/status`, body)).data,
  updatePayment: async (id: string, body: { status: 'PAID' | 'REFUNDED'; note?: string; refundViaProvider?: boolean }) =>
    (await api.patch<Order>(`/orders/${id}/payment`, body)).data,
  updateNotes: async (id: string, internalNote: string) => (await api.patch<Order>(`/orders/${id}/notes`, { internalNote })).data,
};

/** Product / category lookups used by pickers (read-only; products module owns the contract). */
export const lookupApi = {
  products: async (q: string) =>
    (await api.get<LookupProduct[]>('/products', { params: { q: q || undefined, limit: 20, status: 'ACTIVE' } })).data,
  productsByIds: async (ids: string[]) => {
    const out: LookupProduct[] = [];
    await Promise.all(ids.map(async (id) => {
      try { out.push((await api.get<LookupProduct>(`/products/${id}`)).data); } catch { /* deleted product */ }
    }));
    return out;
  },
  variants: async (productId: string) => (await api.get<LookupVariant[]>(`/products/${productId}/variants`)).data,
  categories: async () => (await api.get<LookupCategory[]>('/categories')).data,
};
