import { FEATURE_KEYS, LIMIT_KEYS } from '@vastra/shared';
import { Errors } from '@/common/errors';
import { buildMeta, parsePagination } from '@/common/pagination';
import { SubscriptionPlan, type ISubscriptionPlan } from '@/database/models/subscription-plan.model';
import { Subscription, type ISubscription } from '@/database/models/subscription.model';
import type { FilterQuery } from 'mongoose';
import { Shop } from '@/database/models/shop.model';
import { getEffectiveStatus, toPlanDto } from '@/modules/subscriptions/subscriptions.service';
import { escapeRegex, oid, planBrief } from './admin.helpers';

type Plain = Record<string, unknown>;

const adminPlanDto = (p: ISubscriptionPlan, shopCount: number) => ({ ...toPlanDto(p), isActive: p.isActive, trialDays: p.trialDays, shopCount, createdAt: p.createdAt, updatedAt: p.updatedAt });

async function shopCounts(): Promise<Map<string, number>> {
  const rows = await Subscription.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: '$planId', n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export async function listPlans(includeInactive = true) {
  const [plans, counts] = await Promise.all([
    SubscriptionPlan.find(includeInactive ? {} : { isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    shopCounts(),
  ]);
  return plans.map((p) => adminPlanDto(p, counts.get(String(p._id)) ?? 0));
}

export async function getPlan(id: string) {
  const plan = await SubscriptionPlan.findById(id).lean();
  if (!plan) throw Errors.notFound('NOT_FOUND', 'Plan not found');
  return adminPlanDto(plan, await Subscription.countDocuments({ planId: plan._id }));
}

/** Only one default plan: promote this one and demote the rest. */
async function enforceSingleDefault(id: unknown): Promise<void> {
  await SubscriptionPlan.updateMany({ _id: { $ne: id }, isDefault: true }, { $set: { isDefault: false } });
}

async function assertCodeFree(code: string, exceptId?: string): Promise<void> {
  const clash = await SubscriptionPlan.exists({ code, ...(exceptId ? { _id: { $ne: oid(exceptId) } } : {}) });
  if (clash) throw Errors.conflict('CONFLICT', `A plan with code ${code} already exists`);
}

export async function createPlan(input: Plain & { code: string; isDefault: boolean; isActive: boolean }) {
  await assertCodeFree(input.code);
  if (input.isDefault && !input.isActive) throw Errors.badRequest('VALIDATION_ERROR', 'The default plan must be active');
  const plan = await SubscriptionPlan.create(input);
  if (input.isDefault) await enforceSingleDefault(plan._id);
  return { plan: await getPlan(String(plan._id)) };
}

export async function updatePlan(id: string, input: Plain) {
  const existing = await SubscriptionPlan.findById(id).lean();
  if (!existing) throw Errors.notFound('NOT_FOUND', 'Plan not found');
  if (typeof input.code === 'string' && input.code !== existing.code) await assertCodeFree(input.code, id);
  if (input.isDefault === false && existing.isDefault) throw Errors.badRequest('VALIDATION_ERROR', 'Make another plan the default instead of unsetting this one');
  if (input.isActive === false && existing.isDefault && input.isDefault !== false) throw Errors.badRequest('VALIDATION_ERROR', 'The default plan cannot be deactivated');

  const $set: Plain = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if ((k === 'limits' || k === 'features' || k === 'priceMinor') && v && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v as Plain)) if (sv !== undefined) $set[`${k}.${sk}`] = sv;
    } else $set[k] = v;
  }
  // Limits/features are read live by limits.service, so this takes effect immediately for every shop on the plan.
  await SubscriptionPlan.updateOne({ _id: id }, { $set }, { runValidators: true });
  if (input.isDefault === true) await enforceSingleDefault(oid(id));
  return { before: pickKeys(existing, Object.keys(input)), after: input, plan: await getPlan(id) };
}

const pickKeys = (obj: object, keys: string[]): Plain => Object.fromEntries(keys.map((k) => [k, (obj as Plain)[k]]));

/** Soft delete: isActive=false. Existing shops keep working on it; it can no longer be chosen. */
export async function deactivatePlan(id: string) {
  const plan = await SubscriptionPlan.findById(id).lean();
  if (!plan) throw Errors.notFound('NOT_FOUND', 'Plan not found');
  if (plan.isDefault) throw Errors.conflict('CONFLICT', 'The default plan cannot be deleted. Make another plan the default first.');
  await SubscriptionPlan.updateOne({ _id: id }, { $set: { isActive: false, isPublic: false } });
  return { shopCount: await Subscription.countDocuments({ planId: plan._id }), plan: planBrief(plan) };
}

export const PLAN_KEYS = { limits: LIMIT_KEYS, features: FEATURE_KEYS };

// ------------------------------------------------------------------ subscriptions
export async function listSubscriptions(query: Record<string, unknown> & { status?: string; planId?: string; q?: string }) {
  const { page, limit, skip, sort } = parsePagination(query, { allowedSort: ['createdAt', 'currentPeriodEnd', 'status'] });
  const filter: FilterQuery<ISubscription> = {};
  if (query.status) filter.status = query.status as ISubscription['status'];
  if (query.planId) filter.planId = oid(query.planId);
  if (query.q) {
    const shops = await Shop.find({ $or: [{ name: new RegExp(escapeRegex(query.q), 'i') }, { slug: new RegExp(escapeRegex(query.q), 'i') }] }).select('_id').limit(200).lean();
    filter.shopId = { $in: shops.map((s) => s._id) };
  }
  const [subs, total] = await Promise.all([Subscription.find(filter).sort(sort).skip(skip).limit(limit).lean(), Subscription.countDocuments(filter)]);
  const [shops, plans] = await Promise.all([
    Shop.find({ _id: { $in: subs.map((s) => s.shopId) } }).select('name slug status').lean(),
    SubscriptionPlan.find({ _id: { $in: subs.map((s) => s.planId) } }).lean(),
  ]);
  const shopMap = new Map(shops.map((s) => [String(s._id), s]));
  const planMap = new Map(plans.map((p) => [String(p._id), p]));
  const items = subs.map((s) => {
    const shop = shopMap.get(String(s.shopId));
    return {
      id: String(s._id),
      shop: shop ? { id: String(shop._id), name: shop.name, slug: shop.slug, status: shop.status } : { id: String(s.shopId) },
      plan: planBrief(planMap.get(String(s.planId))),
      status: getEffectiveStatus(s).status,
      storedStatus: s.status,
      interval: s.interval,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      trialEndsAt: s.trialEndsAt ?? null,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      limitOverrides: s.limitOverrides ?? {},
      createdAt: s.createdAt,
    };
  });
  return { items, meta: buildMeta(page, limit, total) };
}

export async function updateSubscription(id: string, input: Record<string, unknown>) {
  const before = await Subscription.findById(id).lean();
  if (!before) throw Errors.notFound('NOT_FOUND', 'Subscription not found');
  const $set: Plain = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    $set[k] = (k === 'currentPeriodEnd' || k === 'trialEndsAt') && typeof v === 'string' ? new Date(v) : v;
  }
  const after = await Subscription.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  return { before: pickKeys(before, Object.keys($set)), after: pickKeys(after ?? {}, Object.keys($set)) };
}
