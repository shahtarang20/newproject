import { Types, type FilterQuery } from 'mongoose';
import { LIMIT_KEYS, type BillingInterval, type LimitKey, type PlanLimits, type SubscriptionStatus } from '@vastra/shared';
import { Errors } from '@/common/errors';
import { buildMeta, parsePagination } from '@/common/pagination';
import { invalidateShopCache, invalidateSlugCache } from '@/common/utils/cache';
import { addMonths } from '@/common/utils/date';
import { Order } from '@/database/models/order.model';
import { Product } from '@/database/models/product.model';
import { Shop, type IShop } from '@/database/models/shop.model';
import { SubscriptionPlan, type ISubscriptionPlan } from '@/database/models/subscription-plan.model';
import { Subscription, type ISubscription } from '@/database/models/subscription.model';
import { ShopStaff } from '@/database/models/shop-staff.model';
import { User } from '@/database/models/user.model';
import { RefreshToken } from '@/database/models/refresh-token.model';
import { getEmailProvider } from '@/providers/notifications/factory';
import { logger } from '@/config/logger';
import { getEffectiveStatus } from '@/modules/subscriptions/subscriptions.service';
import { effectiveLimits, escapeRegex, featuresOf, oid, planBrief, usageRows } from './admin.helpers';

async function planAndSubMaps(shopIds: Types.ObjectId[]) {
  const subs = await Subscription.find({ shopId: { $in: shopIds } }).lean();
  const plans = await SubscriptionPlan.find({ _id: { $in: [...new Set(subs.map((s) => String(s.planId)))] } }).lean();
  return {
    subByShop: new Map<string, ISubscription>(subs.map((s) => [String(s.shopId), s])),
    planById: new Map<string, ISubscriptionPlan>(plans.map((p) => [String(p._id), p])),
  };
}

export async function listShops(query: Record<string, unknown> & { q?: string; status?: string; planId?: string; plan?: string }) {
  const { page, limit, skip, sort } = parsePagination(query, { allowedSort: ['createdAt', 'name', 'status'] });
  const filter: FilterQuery<IShop> = {};
  if (query.status) filter.status = query.status as IShop['status'];
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { slug: rx }, { 'contact.email': rx }];
  }
  let planId = query.planId;
  if (!planId && query.plan) planId = String((await SubscriptionPlan.findOne({ code: query.plan.toUpperCase() }).select('_id').lean())?._id ?? '');
  if (query.planId || query.plan) {
    const subs = planId ? await Subscription.find({ planId: oid(planId) }).select('shopId').lean() : [];
    filter._id = { $in: subs.map((s) => s.shopId) };
  }

  const [shops, total] = await Promise.all([Shop.find(filter).sort(sort).skip(skip).limit(limit).lean(), Shop.countDocuments(filter)]);
  const { subByShop, planById } = await planAndSubMaps(shops.map((s) => s._id));
  const owners = await User.find({ _id: { $in: shops.map((s) => s.ownerId) } }).select('name email').lean();
  const ownerMap = new Map(owners.map((o) => [String(o._id), o]));

  const items = shops.map((s) => {
    const sub = subByShop.get(String(s._id));
    const plan = sub ? planById.get(String(sub.planId)) : undefined;
    const limits = effectiveLimits(plan, sub?.limitOverrides);
    const owner = ownerMap.get(String(s.ownerId));
    return {
      id: String(s._id),
      name: s.name,
      slug: s.slug,
      status: s.status,
      businessType: s.businessType,
      createdAt: s.createdAt,
      owner: owner ? { id: String(owner._id), name: owner.name, email: owner.email } : null,
      plan: planBrief(plan),
      subscriptionStatus: sub ? getEffectiveStatus(sub).status : null,
      usage: usageRows(s.usage, limits),
    };
  });
  return { items, meta: buildMeta(page, limit, total) };
}

export async function getShopDetail(id: string) {
  const shop = await Shop.findById(id).lean();
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  const [sub, owner, productCount, orderCount] = await Promise.all([
    Subscription.findOne({ shopId: shop._id }).lean(),
    User.findById(shop.ownerId).select('name email phone isActive lastLoginAt createdAt').lean(),
    Product.countDocuments({ shopId: shop._id, deletedAt: null }),
    Order.countDocuments({ shopId: shop._id }),
  ]);
  const plan = sub ? await SubscriptionPlan.findById(sub.planId).lean() : null;
  const limits = effectiveLimits(plan, sub?.limitOverrides);
  const { _id, ...rest } = shop as IShop & { __v?: number };
  delete (rest as { __v?: number }).__v;
  return {
    shop: { id: String(_id), ...rest },
    owner: owner ? { id: String(owner._id), name: owner.name, email: owner.email, phone: owner.phone ?? null, isActive: owner.isActive, lastLoginAt: owner.lastLoginAt ?? null } : null,
    subscription: sub
      ? {
          id: String(sub._id),
          plan: planBrief(plan),
          status: getEffectiveStatus(sub).status,
          storedStatus: sub.status,
          interval: sub.interval,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialEndsAt: sub.trialEndsAt ?? null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          limitOverrides: sub.limitOverrides ?? {},
        }
      : null,
    limits,
    features: featuresOf(plan),
    usage: usageRows(shop.usage, limits),
    counts: { products: productCount, orders: orderCount },
  };
}

export async function setShopStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
  const shop = await Shop.findById(id).select('status name ownerId slug').lean();
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  const before = { status: shop.status };
  await Shop.updateOne({ _id: shop._id }, { $set: { status } });
  invalidateShopCache(id);
  invalidateSlugCache(shop.slug);
  if (status === 'SUSPENDED') {
    // Kill live sessions of the owner and staff so access stops once the short-lived access token expires.
    const members = await ShopStaff.find({ shopId: shop._id }).select('userId').lean();
    await RefreshToken.updateMany({ userId: { $in: members.map((m) => m.userId) }, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  if (before.status !== status) {
    const owner = await User.findById(shop.ownerId).select('email name').lean();
    if (owner) {
      const suspended = status === 'SUSPENDED';
      getEmailProvider()
        .send({
          to: owner.email,
          subject: suspended ? `Your shop ${shop.name} has been suspended` : `Your shop ${shop.name} is active again`,
          body: suspended
            ? `Hi ${owner.name},\n\nYour shop "${shop.name}" has been suspended.\nReason: ${reason}\n\nPlease contact support if you believe this is a mistake.`
            : `Hi ${owner.name},\n\nYour shop "${shop.name}" has been reactivated and is live again.`,
          templateKey: suspended ? 'SHOP_SUSPENDED' : 'SHOP_REACTIVATED',
        })
        .catch((err: unknown) => logger.warn({ err }, 'shop status email failed'));
    }
  }
  return { before, after: { status, reason: reason ?? null } };
}

export async function updateShopLimits(id: string, input: { limitOverrides?: Record<string, number | null | undefined>; clearOverrides?: LimitKey[] }) {
  const shop = await Shop.findById(id).select('_id').lean();
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  const current = await Subscription.findOne({ shopId: shop._id }).lean();
  if (!current) throw Errors.notFound('NOT_FOUND', 'This shop has no subscription yet');
  const before = (current.limitOverrides ?? {}) as Partial<PlanLimits>;

  const $set: Record<string, number | null> = {};
  const $unset: Record<string, ''> = {};
  for (const [k, v] of Object.entries(input.limitOverrides ?? {})) {
    if (v !== undefined && (LIMIT_KEYS as readonly string[]).includes(k)) $set[`limitOverrides.${k}`] = v;
  }
  for (const k of input.clearOverrides ?? []) $unset[`limitOverrides.${k}`] = '';
  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  const sub = await Subscription.findByIdAndUpdate(current._id, update, { new: true }).lean();
  invalidateShopCache(id);
  return { limitOverrides: (sub?.limitOverrides ?? {}) as Partial<PlanLimits>, before };
}

export async function assignShopPlan(
  id: string,
  input: { planId: string; interval?: BillingInterval; status?: SubscriptionStatus; currentPeriodEnd?: string | null; resetOverrides?: boolean },
) {
  const [shop, plan] = await Promise.all([Shop.findById(id).select('_id usage').lean(), SubscriptionPlan.findById(input.planId).lean()]);
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  if (!plan) throw Errors.notFound('NOT_FOUND', 'Plan not found');
  const prev = await Subscription.findOne({ shopId: shop._id }).lean();
  const interval = input.interval ?? prev?.interval ?? 'MONTHLY';
  const now = new Date();
  const paid = plan.priceMinor[interval] > 0;
  const periodEnd =
    input.currentPeriodEnd !== undefined
      ? input.currentPeriodEnd === null
        ? null
        : new Date(input.currentPeriodEnd)
      : paid
        ? addMonths(now, interval === 'YEARLY' ? 12 : 1)
        : null;
  const $set: Record<string, unknown> = {
    planId: plan._id,
    status: input.status ?? 'ACTIVE',
    interval,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
  };
  if ((input.status ?? 'ACTIVE') !== 'TRIALING') $set.trialEndsAt = null;
  if (input.resetOverrides) $set.limitOverrides = {};
  const sub = await Subscription.findOneAndUpdate({ shopId: shop._id }, { $set, $setOnInsert: input.resetOverrides ? {} : { limitOverrides: {} } }, { upsert: true, new: true }).lean();
  await Shop.updateOne({ _id: shop._id }, { $set: { subscriptionId: sub._id } });
  invalidateShopCache(id);

  const limits = effectiveLimits(plan, sub.limitOverrides);
  const overLimit = usageRows(shop.usage, limits).filter((r) => r.limit !== null && r.used > r.limit).map((r) => r.key);
  return { plan: planBrief(plan), status: sub.status, interval: sub.interval, currentPeriodEnd: sub.currentPeriodEnd, overLimit, before: { planId: prev ? String(prev.planId) : null }, after: { planId: String(plan._id) } };
}
