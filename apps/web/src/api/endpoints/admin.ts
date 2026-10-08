import { api } from '../client';
import type {
  AdminAnalytics, AdminPlan, AdminShopDetail, AdminShopListItem, AdminStorage, AdminSubscriptionRow, AdminUser, AuditLogEntry,
  LogsQuery, Paged, PlanInput, PlatformSettings, ShopLimitsPayload, ShopPlanPayload, ShopsQuery, SubscriptionPatch,
  SubscriptionsQuery, UsersQuery,
} from '@/types/admin';

/** Drop undefined / empty-string params so they are not sent. */
const clean = <T extends object>(params?: T) =>
  Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '' && v !== null));

async function list<T>(url: string, params?: object): Promise<Paged<T>> {
  const res = await api.get<T[]>(url, { params: clean(params) });
  return { items: res.data ?? [], meta: res.meta };
}

export const adminApi = {
  // shops
  shops: (q?: ShopsQuery) => list<AdminShopListItem>('/admin/shops', q),
  shop: async (id: string) => (await api.get<AdminShopDetail>(`/admin/shops/${id}`)).data,
  setShopStatus: async (id: string, body: { status: 'ACTIVE' | 'SUSPENDED'; reason?: string }) =>
    (await api.patch<AdminShopDetail>(`/admin/shops/${id}/status`, body)).data,
  setShopLimits: async (id: string, body: ShopLimitsPayload) => (await api.patch<AdminShopDetail>(`/admin/shops/${id}/limits`, body)).data,
  setShopPlan: async (id: string, body: ShopPlanPayload) => (await api.patch<AdminShopDetail>(`/admin/shops/${id}/plan`, body)).data,

  // users
  users: (q?: UsersQuery) => list<AdminUser>('/admin/users', q),
  updateUser: async (id: string, body: { isActive: boolean }) => (await api.patch<AdminUser>(`/admin/users/${id}`, body)).data,

  // plans
  plans: async (includeInactive = true) =>
    (await api.get<AdminPlan[]>('/admin/plans', { params: includeInactive ? { includeInactive: 'true' } : { includeInactive: 'false' } })).data ?? [],
  createPlan: async (body: PlanInput) => (await api.post<AdminPlan>('/admin/plans', body)).data,
  updatePlan: async (id: string, body: Partial<PlanInput>) => (await api.patch<AdminPlan>(`/admin/plans/${id}`, body)).data,
  deletePlan: async (id: string) => (await api.delete<{ deactivated: boolean; shopCount: number }>(`/admin/plans/${id}`)).data,

  // subscriptions
  subscriptions: (q?: SubscriptionsQuery) => list<AdminSubscriptionRow>('/admin/subscriptions', q),
  updateSubscription: async (id: string, body: SubscriptionPatch) => (await api.patch<unknown>(`/admin/subscriptions/${id}`, body)).data,

  // analytics / storage
  analytics: async (days?: number) => (await api.get<AdminAnalytics>('/admin/analytics', { params: clean({ days }) })).data,
  storage: async (q?: { page?: number; limit?: number; q?: string }): Promise<AdminStorage> => {
    const res = await api.get<Omit<AdminStorage, 'meta'>>('/admin/storage', { params: clean(q) });
    return { ...res.data, meta: res.meta };
  },

  // settings / logs
  settings: async () => (await api.get<PlatformSettings>('/admin/settings')).data,
  saveSettings: async (body: PlatformSettings) => (await api.put<PlatformSettings>('/admin/settings', body)).data,
  logs: (q?: LogsQuery) => list<AuditLogEntry>('/admin/logs', q),
};
