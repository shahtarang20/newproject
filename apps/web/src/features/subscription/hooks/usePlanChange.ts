import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { BillingInterval } from '@vastra/shared';
import { ApiError } from '@/api/client';
import { subscriptionApi } from '@/api/endpoints/subscription';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/utils/errors';
import type { PlanDto } from '@/types/settings';
import { openRazorpayCheckout } from '../lib';

export interface ExceededLimit { key: string; used: number; limit: number }

/** Runs the change -> (checkout -> verify) flow. Never reports success unless the server confirms it. */
export function usePlanChange() {
  const qc = useQueryClient();
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [exceeded, setExceeded] = useState<{ plan: PlanDto; items: ExceededLimit[]; message: string } | null>(null);

  const done = async (planName: string) => {
    await qc.invalidateQueries({ queryKey: queryKeys.subscription.all });
    await qc.invalidateQueries({ queryKey: queryKeys.shop.all });
    void useAuthStore.getState().refreshMe().catch(() => undefined);
    toast.success(`You're now on the ${planName} plan`);
  };

  const change = async (plan: PlanDto, interval: BillingInterval, buyer?: { name?: string; email?: string; contact?: string }) => {
    setBusyPlanId(plan.id);
    try {
      const res = await subscriptionApi.change(plan.id, interval);
      if (res.status === 'COMPLETED') return void (await done(plan.name));

      const payload = res.clientPayload;
      if (typeof payload.checkoutUrl === 'string') {
        toast.info('Redirecting to the payment page…');
        window.location.assign(payload.checkoutUrl);
        return;
      }
      if (res.provider !== 'razorpay') {
        toast.error(`Online checkout for "${res.provider}" is not supported in the dashboard yet. Your plan was not changed.`);
        return;
      }
      const result = await openRazorpayCheckout({ ...payload, prefill: { ...(payload.prefill as object | undefined), ...buyer } });
      if (result.status !== 'success') {
        if (result.status === 'unavailable') toast.error('Could not load the payment window. Check your connection and try again. You have not been charged.');
        else if (result.status === 'dismissed') toast.info('Payment cancelled. Your plan was not changed.');
        else toast.error('The payment failed. Your plan was not changed.');
        return;
      }

      await subscriptionApi.verify(res.changeId, result.payload);
      await done(plan.name);
    } catch (e) {
      const details = e instanceof ApiError ? (e.details as { exceeded?: ExceededLimit[] } | undefined) : undefined;
      if (e instanceof ApiError && e.code === 'VALIDATION_ERROR' && details?.exceeded?.length) {
        setExceeded({ plan, items: details.exceeded, message: e.message });
      } else {
        toast.error(getErrorMessage(e, 'Could not change your plan'));
      }
    } finally {
      setBusyPlanId(null);
    }
  };

  return { change, busyPlanId, exceeded, clearExceeded: () => setExceeded(null) };
}
