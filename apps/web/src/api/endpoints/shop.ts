import { api, baseURL, http } from '../client';
import type { ShopDto, TemplateMeta, UpdateShopInput, UsageRow } from '@/types/settings';

export const shopApi = {
  get: async () => (await api.get<ShopDto>('/shop')).data,
  update: async (input: UpdateShopInput) => (await api.patch<ShopDto>('/shop', input)).data,
  templates: async () => (await api.get<TemplateMeta[]>('/shop/templates')).data,
  usage: async () => (await api.get<{ usage: UsageRow[] }>('/shop/usage')).data,
  uploadLogo: async (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return (await api.upload<{ logoUrl: string }>('/shop/logo', form, onProgress)).data;
  },
  uploadCover: async (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return (await api.upload<{ coverUrl: string }>('/shop/cover', form, onProgress)).data;
  },
  /** GET /qr/shop returns an image; fetched as a blob (auth header applied by the http client). */
  qrBlob: async (): Promise<Blob> => {
    const res = await http.get('/qr/shop', { responseType: 'blob', params: { format: 'png' } });
    return res.data as Blob;
  },
};
export { baseURL };
