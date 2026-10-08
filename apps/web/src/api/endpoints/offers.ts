import { api } from '../client';
import type { Coupon, CouponPayload, Offer, OfferPayload } from '@/types/commerce';

export const offersApi = {
  list: async (params: { q?: string; page?: number; limit?: number } = {}) => {
    const res = await api.get<Offer[]>('/offers', { params: { limit: 100, ...params } });
    return { items: res.data, meta: res.meta };
  },
  create: async (body: OfferPayload) => (await api.post<Offer>('/offers', body)).data,
  update: async (id: string, body: Partial<OfferPayload>) => (await api.patch<Offer>(`/offers/${id}`, body)).data,
  toggle: async (id: string) => (await api.patch<Offer>(`/offers/${id}/toggle`)).data,
  remove: async (id: string) => { await api.delete(`/offers/${id}`); },

  coupons: async () => {
    const res = await api.get<Coupon[]>('/offers/coupons', { params: { limit: 100 } });
    return { items: res.data, meta: res.meta };
  },
  createCoupon: async (body: CouponPayload) => (await api.post<Coupon>('/offers/coupons', body)).data,
  updateCoupon: async (id: string, body: Partial<Omit<CouponPayload, 'code'>>) => (await api.patch<Coupon>(`/offers/coupons/${id}`, body)).data,
  toggleCoupon: async (id: string) => (await api.patch<Coupon>(`/offers/coupons/${id}/toggle`)).data,
  removeCoupon: async (id: string) => { await api.delete(`/offers/coupons/${id}`); },
};
