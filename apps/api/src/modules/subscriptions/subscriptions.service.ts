import { Types } from 'mongoose';
import {
  LIMIT_KEYS,
  type BillingInterval,
  type LimitKey,
  type PlanLimits,
  type SubscriptionStatus,
} from '@vastra/shared';
import { Errors } from '@/common/errors';
import { addDays, addMonths } from '@/common/utils/date';
import { Shop, type IShopUsage } from '@/database/models/shop.model';
import { SubscriptionPlan, type ISubscriptionPlan } from '@/database/models/subscription-plan.model';
import { Subscription, type ISubscription } from '@/database/models/subscription.model';
import { getPaymentProvider } from '@/providers/payments/factory';
import { notify } from '@/providers/notifications/notify.service';
import { getEffectiveLimits, getUsageSummary } from './limits.service';
import { ensureDefaultPlan } from './plan.bootstrap';
import { SubscriptionChange } from './subscription-change.model';

/** Days a PAST_DUE / lapsed paid subscription keeps working before it is reported as EXPIRED. */
export const PAYMENT_GRACE_DAYS = 7;

const LIMIT_TO_USAGE: Record<LimitKey, Exclude<keyof IShopUsage, 'periodStart'>> = {
  products: 'products',
  images: 'images',
  videos: 'videos',
  storageBytes: 'storageBytes',
  customers: 'customers',
  ordersPerMonth: 'ordersThisPeriod',
  staff: 'staff',
  catalogues: 'catalogues',
};

export interface EffectiveStatus {
  status: SubscriptionStatus;
  /** Stored status when it differs from the effective one. */
  storedStatus: SubscriptionStatus;
  isActive: boolean;
  trialDaysLeft: number | null;
  graceEndsAt: Date | null;
}

/**
 * Derives the real status from dates (nothing runs a cron yet):
 * TRIALING past trialEndsAt -> PAST_DUE for the grace window, then EXPIRED;
 * ACTIVE paid period past currentPeriodEnd -> same. Free (null period end) never lapses.
 * NOTE: limits.service still reads plan limits regardless of status; enforcement of EXPIRED is a TODO(billing-webhooks).
 */
export function getEffectiveStatus(sub: Pick<ISubscription, 'status' | 'currentPeriodEnd' | 'trialEndsAt'> | null, now = new Date()): EffectiveStatus {
  if (!sub) return { status: 'ACTIVE', storedStatus: 'ACTIVE', isActive: true, trialDaysLeft: null, graceEndsAt: null };
  const stored = sub.status;
  let status: SubscriptionStatus = stored;
  let graceEndsAt: Date | null = null;
  const end = stored === 'TRIALING' ? (sub.trialEndsAt ?? sub.currentPeriodEnd) : sub.currentPeriodEnd;
  if ((stored === 'TRIALING' || stored === 'ACTIVE' || stored === 'PAST_DUE') && end && end.getTime() < now.getTime()) {
    graceEndsAt = addDays(end, PAYMENT_GRACE_DAYS);
    status = graceEndsAt.getTime() > now.getTime() ? 'PAST_DUE' : 'EXPIRED';
  }
  const trialDaysLeft =
    status === 'TRIALING' && sub.trialEndsAt ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86_400_000)) : null;
  return { status, storedStatus: stored, isActive: status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE', trialDaysLeft, graceEndsAt };
}

export const toPlanDto = (p: ISubscriptionPlan) => ({
  id: String(p._id),
  code: p.code,
  name: p.name,
  description: p.description ?? null,
  priceMinor: p.priceMinor,
  currency: p.currency,
  trialDays: p.trialDays,
  limits: p.limits,
  features: p.features,
  isPublic: p.isPublic,
  isDefault: p.isDefault,
  sortOrder: p.sortOrder,
});

export async function listPublicPlans() {
  await ensureDefaultPlan();
  const plans = await SubscriptionPlan.find({ isActive: true, isPublic: true }).sort({ sortOrder: 1 }).lean();
  return plans.map(toPlanDto);
}

export async function getSubscriptionOverview(shopId: string) {
  const [{ limits, features, plan, subscription }, usage] = await Promise.all([getEffectiveLimits(shopId), getUsageSummary(shopId)]);
  const eff = getEffectiveStatus(subscription);
  const pending = await SubscriptionChange.findOne({ shopId: new Types.ObjectId(shopId), status: 'PENDING_PAYMENT' }).sort({ createdAt: -1 }).lean();
  return {
    plan: toPlanDto(plan),
    status: eff.status,
    storedStatus: eff.storedStatus,
    isActive: eff.isActive,
    interval: subscription?.interval ?? 'MONTHLY',
    currentPeriodStart: subscription?.currentPeriodStart ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    trialEndsAt: subscription?.trialEndsAt ?? null,
    trialDaysLeft: eff.trialDaysLeft,
    graceEndsAt: eff.graceEndsAt,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    limits,
    limitOverrides: subscription?.limitOverrides ?? {},
    features,
    usage,
    pendingChange: pending
      ? {
          id: String(pending._id),
          planId: String(pending.planId),
          interval: pending.interval,
          amountMinor: pending.amountMinor,
          currency: pending.currency,
          createdAt: pending.createdAt,
        }
      : null,
  };
}

/** Limits that the target plan (plus this shop's overrides) would put the shop over. */
export async function findExceededLimits(shopId: string, target: ISubscriptionPlan) {
  const [shop, sub] = await Promise.all([
    Shop.findById(shopId).select('usage').lean(),
    Subscription.findOne({ shopId: new Types.ObjectId(shopId) }).select('limitOverrides').lean(),
  ]);
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  const overrides = (sub?.limitOverrides ?? {}) as Partial<PlanLimits>;
  const exceeded: Array<{ key: LimitKey; used: number; limit: number }> = [];
  for (const key of LIMIT_KEYS) {
    const limit = overrides[key] !== undefined ? overrides[key] : target.limits[key];
    if (limit === null || limit === undefined) continue;
    const used = shop.usage[LIMIT_TO_USAGE[key]] ?? 0;
    if (used > limit) exceeded.push({ key, used, limit });
  }
  return exceeded;
}

async function applyPlan(shopId: string, plan: ISubscriptionPlan, interval: BillingInterval, opts: { paid: boolean }): Promise<ISubscription> {
  const now = new Date();
  const paid = opts.paid && plan.priceMinor[interval] > 0;
  const sub = await Subscription.findOneAndUpdate(
    { shopId: new Types.ObjectId(shopId) },
    {
      $set: {
        planId: plan._id,
        status: 'ACTIVE',
        interval,
        currentPeriodStart: now,
        currentPeriodEnd: paid ? addMonths(now, interval === 'YEARLY' ? 12 : 1) : null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
      },
      $setOnInsert: { limitOverrides: {} },
    },
    { upsert: true, new: true },
  ).lean();
  await Shop.updateOne({ _id: shopId }, { $set: { subscriptionId: sub._id } });
  return sub;
}

export type ChangePlanResult =
  | { status: 'COMPLETED'; subscription: Awaited<ReturnType<typeof getSubscriptionOverview>> }
  | {
      status: 'PENDING_PAYMENT';
      changeId: string;
      provider: string;
      providerOrderId: string;
      amountMinor: number;
      currency: string;
      clientPayload: Record<string, unknown>;
    };

export async function changePlan(shopId: string, userId: string, input: { planId: string; interval: BillingInterval }): Promise<ChangePlanResult & { before: string | null; after: string }> {
  const plan = await SubscriptionPlan.findOne({ _id: input.planId, isActive: true }).lean();
  if (!plan || (!plan.isPublic && !plan.isDefault)) throw Errors.notFound('NOT_FOUND', 'Plan not found');

  const exceeded = await findExceededLimits(shopId, plan);
  if (exceeded.length) {
    throw Errors.badRequest(
      'VALIDATION_ERROR',
      `You are over the limits of the ${plan.name} plan for: ${exceeded.map((e) => `${e.key} (${e.used}/${e.limit})`).join(', ')}. Reduce usage before switching.`,
      { exceeded },
    );
  }
  const current = await Subscription.findOne({ shopId: new Types.ObjectId(shopId) }).lean();
  const before = current ? String(current.planId) : null;
  const amountMinor = plan.priceMinor[input.interval];

  if (amountMinor <= 0) {
    await SubscriptionChange.updateMany({ shopId: new Types.ObjectId(shopId), status: 'PENDING_PAYMENT' }, { $set: { status: 'SUPERSEDED' } });
    await applyPlan(shopId, plan, input.interval, { paid: false });
    return { status: 'COMPLETED', subscription: await getSubscriptionOverview(shopId), before, after: String(plan._id) };
  }

  // Paid plan: create a provider order; the live subscription stays untouched until /subscription/verify succeeds.
  // TODO(billing-webhooks): recurring provider subscriptions, renewals, dunning and cancel-at-period-end sync
  // are not implemented. Each period is a one-off payment; renewal means calling /subscription/change again.
  const changeId = new Types.ObjectId();
  const provider = getPaymentProvider();
  const order = await provider.createOrder({
    amountMinor,
    currency: plan.currency,
    receipt: `sub_${String(changeId).slice(-16)}`,
    notes: { shopId, planId: String(plan._id), interval: input.interval, changeId: String(changeId) },
  });
  await SubscriptionChange.updateMany({ shopId: new Types.ObjectId(shopId), status: 'PENDING_PAYMENT' }, { $set: { status: 'SUPERSEDED' } });
  await SubscriptionChange.create({
    _id: changeId,
    shopId: new Types.ObjectId(shopId),
    planId: plan._id,
    interval: input.interval,
    amountMinor,
    currency: plan.currency,
    provider: provider.name,
    providerOrderId: order.providerOrderId,
    status: 'PENDING_PAYMENT',
    requestedBy: new Types.ObjectId(userId),
  });
  return {
    status: 'PENDING_PAYMENT',
    changeId: String(changeId),
    provider: provider.name,
    providerOrderId: order.providerOrderId,
    amountMinor,
    currency: plan.currency,
    clientPayload: order.clientPayload,
    before,
    after: String(plan._id),
  };
}

export async function verifyPlanPayment(shopId: string, input: { changeId: string; payload: Record<string, unknown> }) {
  const change = await SubscriptionChange.findOne({ _id: input.changeId, shopId: new Types.ObjectId(shopId) });
  if (!change) throw Errors.notFound('NOT_FOUND', 'Plan change not found');
  if (change.status === 'COMPLETED') return getSubscriptionOverview(shopId);
  if (change.status !== 'PENDING_PAYMENT') throw Errors.conflict('CONFLICT', 'This plan change is no longer pending');

  // The client payload must reference OUR provider order.
  const referenced = ['razorpay_order_id', 'paymentIntentId', 'providerOrderId']
    .map((k) => input.payload[k])
    .filter((v): v is string => typeof v === 'string');
  if (!referenced.length || referenced.some((v) => v !== change.providerOrderId)) {
    throw Errors.badRequest('PAYMENT_FAILED', 'Payment does not match this plan change');
  }
  const result = await getPaymentProvider().verifyPayment(input.payload);
  if (!result.ok) {
    throw Errors.badRequest('PAYMENT_FAILED', 'Payment could not be verified. Your plan has not been changed.');
  }
  const plan = await SubscriptionPlan.findById(change.planId).lean();
  if (!plan) throw Errors.notFound('NOT_FOUND', 'Plan no longer exists');

  // Claim atomically so concurrent verifies apply once.
  const claimed = await SubscriptionChange.findOneAndUpdate(
    { _id: change._id, status: 'PENDING_PAYMENT' },
    { $set: { status: 'COMPLETED', providerPaymentId: result.providerPaymentId, completedAt: new Date() } },
  );
  if (!claimed) return getSubscriptionOverview(shopId);
  await applyPlan(shopId, plan, change.interval, { paid: true });
  void notify({
    shopId,
    type: 'PAYMENT_RECEIVED',
    title: `Subscription upgraded to ${plan.name}`,
    body: `Your ${plan.name} plan (${change.interval.toLowerCase()}) is now active.`,
    data: { planId: String(plan._id) },
  });
  return getSubscriptionOverview(shopId);
}
