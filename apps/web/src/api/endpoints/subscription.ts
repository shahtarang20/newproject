import { api } from '../client';
import type { BillingInterval } from '@vastra/shared';
import type { ChangePlanResult, PlanDto, SubscriptionDto } from '@/types/settings';

export const subscriptionApi = {
  current: async () => (await api.get<SubscriptionDto>('/subscription')).data,
  plans: async () => (await api.get<PlanDto[]>('/subscription/plans')).data,
  change: async (planId: string, interval: BillingInterval) =>
    (await api.post<ChangePlanResult>('/subscription/change', { planId, interval })).data,
  verify: async (changeId: string, payload: Record<string, unknown>) =>
    (await api.post<SubscriptionDto>('/subscription/verify', { changeId, payload })).data,
};
