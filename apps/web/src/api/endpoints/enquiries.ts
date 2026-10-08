import { api } from '../client';
import type { Enquiry, EnquiryListQuery, EnquiryStats } from '@/types/insights';
import type { EnquiryStatus } from '@vastra/shared';

export const enquiriesApi = {
  list: async (params: EnquiryListQuery) => {
    const res = await api.get<Enquiry[]>('/enquiries', { params });
    return { items: res.data, meta: res.meta };
  },
  stats: async () => (await api.get<EnquiryStats>('/enquiries/stats')).data,
  get: async (id: string) => (await api.get<Enquiry>(`/enquiries/${id}`)).data,
  update: async (id: string, body: { status?: EnquiryStatus; response?: string }) => (await api.patch<Enquiry>(`/enquiries/${id}`, body)).data,
};
