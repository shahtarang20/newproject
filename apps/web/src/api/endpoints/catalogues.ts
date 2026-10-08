import { api } from '../client';
import type { Catalogue, CatalogueDetail, CatalogueInput, CatalogueShare, Paged } from '@/types/catalog';

export interface CatalogueListParams { page?: number; limit?: number; search?: string; published?: boolean; sort?: string }

export const cataloguesApi = {
  list: async (params: CatalogueListParams = {}): Promise<Paged<Catalogue>> => {
    const res = await api.get<Catalogue[]>('/catalogues', { params: { ...params, search: params.search || undefined } });
    return { items: res.data ?? [], meta: res.meta };
  },
  get: async (id: string) => (await api.get<CatalogueDetail>(`/catalogues/${id}`)).data,
  create: async (body: CatalogueInput) => (await api.post<Catalogue>('/catalogues', body)).data,
  update: async (id: string, body: CatalogueInput) => (await api.patch<Catalogue>(`/catalogues/${id}`, body)).data,
  remove: async (id: string) => {
    await api.delete(`/catalogues/${id}`);
  },
  uploadCover: async (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return (await api.upload<Catalogue>(`/catalogues/${id}/cover`, form)).data;
  },
  setProducts: async (id: string, productIds: string[]) => (await api.put<Catalogue>(`/catalogues/${id}/products`, { productIds })).data,
  publish: async (id: string) => (await api.post<Catalogue>(`/catalogues/${id}/publish`)).data,
  unpublish: async (id: string) => (await api.post<Catalogue>(`/catalogues/${id}/unpublish`)).data,
  share: async (id: string) => (await api.get<CatalogueShare>(`/catalogues/${id}/share`)).data,
};
