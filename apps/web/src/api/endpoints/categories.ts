import { api } from '../client';
import type { Category, CategoryInput } from '@/types/catalog';

export const categoriesApi = {
  list: async (params: { tree?: boolean; parentId?: string; isActive?: boolean; q?: string } = {}) =>
    (await api.get<Category[]>('/categories', { params })).data ?? [],
  get: async (id: string) => (await api.get<Category>(`/categories/${id}`)).data,
  create: async (body: CategoryInput) => (await api.post<Category>('/categories', body)).data,
  update: async (id: string, body: CategoryInput) => (await api.patch<Category>(`/categories/${id}`, body)).data,
  reorder: async (items: { id: string; sortOrder: number }[]) => {
    await api.patch('/categories/reorder', { items });
  },
  uploadImage: async (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return (await api.upload<Category>(`/categories/${id}/image`, form)).data;
  },
  remove: async (id: string, reassignTo?: string) => {
    await api.delete(`/categories/${id}`, { params: reassignTo ? { reassignTo } : undefined });
  },
};
