import { api } from '../client';
import type {
  AnalyticsRange, DashboardData, DashboardRange, FunnelData, ProductPerformance, ProductSort, SalesAnalytics, SalesGroupBy, ShopUsageData,
} from '@/types/insights';
import type { PaginationMeta } from '@vastra/shared';

export const analyticsApi = {
  dashboard: async (range: DashboardRange = '30d') => (await api.get<DashboardData>('/analytics/dashboard', { params: { range } })).data,
  sales: async (params: { range: AnalyticsRange; groupBy: SalesGroupBy }) => (await api.get<SalesAnalytics>('/analytics/sales', { params })).data,
  products: async (params: { range: AnalyticsRange; page?: number; limit?: number; sort?: ProductSort; order?: 'asc' | 'desc' }) => {
    const res = await api.get<ProductPerformance>('/analytics/products', { params });
    return { ...res.data, meta: res.meta as PaginationMeta | undefined };
  },
  funnel: async (range: AnalyticsRange) => (await api.get<FunnelData>('/analytics/funnel', { params: { range } })).data,
  usage: async () => (await api.get<ShopUsageData>('/shop/usage')).data,
  /** Cheap count helpers used by the onboarding checklist. */
  countProducts: async (status?: string) =>
    (await api.get<unknown[]>('/products', { params: { limit: 1, ...(status ? { status } : {}) } })).meta?.total ?? 0,
  countCategories: async () => (await api.get<unknown[]>('/categories')).data?.length ?? 0,
};
