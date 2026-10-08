import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi } from '@/api/endpoints/admin';
import { queryKeys } from '@/api/queryKeys';
import { getErrorMessage } from '@/utils/errors';
import type { LogsQuery, ShopsQuery, SubscriptionsQuery, UsersQuery } from '@/types/admin';

const key = queryKeys.admin.section;

export const useAdminShops = (p: ShopsQuery) => useQuery({ queryKey: key('shops', p), queryFn: () => adminApi.shops(p), placeholderData: keepPreviousData });
export const useAdminShop = (id: string | null) => useQuery({ queryKey: key('shop', id), queryFn: () => adminApi.shop(id as string), enabled: !!id });
export const useAdminUsers = (p: UsersQuery) => useQuery({ queryKey: key('users', p), queryFn: () => adminApi.users(p), placeholderData: keepPreviousData });
export const useAdminPlans = () => useQuery({ queryKey: key('plans'), queryFn: () => adminApi.plans(true) });
export const useAdminSubscriptions = (p: SubscriptionsQuery) =>
  useQuery({ queryKey: key('subscriptions', p), queryFn: () => adminApi.subscriptions(p), placeholderData: keepPreviousData });
export const useAdminAnalytics = (days?: number) => useQuery({ queryKey: key('analytics', { days }), queryFn: () => adminApi.analytics(days), placeholderData: keepPreviousData });
export const useAdminStorage = (p: { page?: number; q?: string }) =>
  useQuery({ queryKey: key('storage', p), queryFn: () => adminApi.storage({ ...p, limit: 20 }), placeholderData: keepPreviousData });
export const useAdminSettings = () => useQuery({ queryKey: key('settings'), queryFn: adminApi.settings });
export const useAdminLogs = (p: LogsQuery) => useQuery({ queryKey: key('logs', p), queryFn: () => adminApi.logs(p), placeholderData: keepPreviousData });

/** Mutation that toasts and invalidates every admin query (and subscription/plan caches shown to shops). */
export function useAdminMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>, opts?: { success?: string | ((r: TRes) => string | null); onSuccess?: (r: TRes, v: TVars) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      void qc.invalidateQueries({ queryKey: queryKeys.subscription.all });
      const msg = typeof opts?.success === 'function' ? opts.success(res) : opts?.success;
      if (msg) toast.success(msg);
      opts?.onSuccess?.(res, vars);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
