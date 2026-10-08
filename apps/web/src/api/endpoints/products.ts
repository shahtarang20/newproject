import { api, http } from '../client';
import type { Media, Paged, Product, ProductListParams, ProductWritePayload, ShopUsage, Variant, VariantPayload } from '@/types/catalog';
import type { ProductStatus } from '@vastra/shared';

const clean = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== '' && v !== null));

export const productsApi = {
  list: async (params: ProductListParams = {}): Promise<Paged<Product>> => {
    const res = await api.get<Product[]>('/products', { params: clean({ ...params }) });
    return { items: res.data ?? [], meta: res.meta };
  },
  get: async (id: string) => (await api.get<Product>(`/products/${id}`)).data,
  create: async (body: ProductWritePayload) => (await api.post<Product>('/products', body)).data,
  update: async (id: string, body: ProductWritePayload) => (await api.patch<Product>(`/products/${id}`, body)).data,
  remove: async (id: string) => {
    await api.delete(`/products/${id}`);
  },
  duplicate: async (id: string) => (await api.post<Product & { mediaCopy?: { copied: number; skipped: number; reason?: string } }>(`/products/${id}/duplicate`)).data,
  setStatus: async (id: string, status: ProductStatus) => (await api.patch<Product>(`/products/${id}/status`, { status })).data,

  // variants
  listVariants: async (id: string) => (await api.get<Variant[]>(`/products/${id}/variants`)).data,
  createVariant: async (id: string, body: VariantPayload) => (await api.post<Variant>(`/products/${id}/variants`, body)).data,
  updateVariant: async (id: string, variantId: string, body: VariantPayload) =>
    (await api.patch<Variant>(`/products/${id}/variants/${variantId}`, body)).data,
  deleteVariant: async (id: string, variantId: string) =>
    (await api.delete<{ deleted: boolean; deactivated: boolean }>(`/products/${id}/variants/${variantId}`)).data,

  // media
  listMedia: async (id: string) => (await api.get<Media[]>(`/products/${id}/media`)).data,
  uploadMedia: async (id: string, files: File[], onProgress?: (pct: number) => void) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return (await api.upload<Media[]>(`/products/${id}/media`, form, onProgress, { timeout: 10 * 60_000 })).data;
  },
  reorderMedia: async (id: string, orderedIds: string[]) => (await api.patch<Media[]>(`/products/${id}/media/reorder`, { orderedIds })).data,
  setPrimaryMedia: async (id: string, mediaId: string) => (await api.patch<Media[]>(`/products/${id}/media/${mediaId}/primary`)).data,
  updateMedia: async (id: string, mediaId: string, body: { altText?: string | null; variantId?: string | null }) =>
    (await api.patch<Media>(`/products/${id}/media/${mediaId}`, body)).data,
  deleteMedia: async (id: string, mediaId: string) => {
    await api.delete(`/products/${id}/media/${mediaId}`);
  },
};

export const shopUsageApi = {
  get: async () => (await api.get<ShopUsage>('/shop/usage')).data,
};

/** QR image as blob (server-rendered; needs bearer token). */
export const qrApi = {
  blob: async (kind: 'shop' | 'product' | 'catalogue', id?: string, opts: { format?: 'png' | 'svg'; size?: number } = {}) => {
    const path = kind === 'shop' ? '/qr/shop' : `/qr/${kind}/${id}`;
    const res = await http.get<Blob>(path, { params: { format: opts.format ?? 'png', size: opts.size ?? 512 }, responseType: 'blob' });
    return res.data;
  },
};
