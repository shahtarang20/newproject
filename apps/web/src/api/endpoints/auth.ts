import { api } from '../client';
import type { AuthSession, LoginPayload, MeResponse, RegisterPayload } from '@/types/api';

export const authApi = {
  register: async (payload: RegisterPayload) => (await api.post<AuthSession>('/auth/register', payload)).data,
  login: async (payload: LoginPayload) => (await api.post<AuthSession>('/auth/login', payload)).data,
  refresh: async () => (await api.post<AuthSession>('/auth/refresh')).data,
  logout: async () => {
    await api.post<void>('/auth/logout');
  },
  me: async () => (await api.get<MeResponse>('/auth/me')).data,
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    await api.post<void>('/auth/change-password', payload);
  },
  /** Public slug availability check. Server route: GET /auth/slug-available?slug=... */
  slugAvailable: async (slug: string, signal?: AbortSignal) =>
    (await api.get<{ available: boolean; suggestion?: string }>('/auth/slug-available', { params: { slug }, signal })).data,
};
