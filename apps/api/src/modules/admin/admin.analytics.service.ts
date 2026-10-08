import { LIMIT_KEYS, type LimitKey } from '@vastra/shared';
import { buildMeta, parsePagination } from '@/common/pagination';
import { addDays, startOfUtcDay } from '@/common/utils/date';
import { Order } from '@/database/models/order.model';
import { Product } from '@/database/models/product.model';
import { Shop } from '@/database/models/shop.model';
import { SubscriptionPlan, type ISubscriptionPlan } from '@/database/models/subscription-plan.model';
import { Subscription } from '@/database/models/subscription.model';
import { User } from '@/database/models/user.model';
import { effectiveLimits, escapeRegex, planBrief, usageRows } from './admin.helpers';

const NEAR_LIMIT_PERCENT = 80;
/** Upper bound of shops scanned for the "near limits" widget (cursor, constant memory). */
const NEAR_LIMIT_SCAN_CAP = 5000;

const dailySeries = (rows: Array<{ _id: string; n: number }>, from: Date, days: number) => {
  const map = new Map(rows.map((r) => [r._id, r.n]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i).toISOString().slice(0, 10);
    return { date, count: map.get(date) ?? 0 };
  });
};

export async function platformAnalytics(days = 30) {
  const from = startOfUtcDay(addDays(new Date(), -(days - 1)));
  const dayFmt = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  const countedOrder = { status: { $nin: ['CANCELLED', 'REJECTED'] } };

  const [shopTotal, shopActive, shopSuspended, userTotal, productTotal, orderTotal, gmv, shopSignups, userSignups, topRaw, activeSubs] = await Promise.all([
    Shop.countDocuments(),
    Shop.countDocuments({ status: 'ACTIVE' }),
    Shop.countDocuments({ status: 'SUSPENDED' }),
    User.countDocuments(),
    Product.countDocuments({ deletedAt: null }),
    Order.countDocuments(),
    Order.aggregate<{ _id: null; total: number; orders: number }>([{ $match: countedOrder }, { $group: { _id: null, total: { $sum: '$totalMinor' }, orders: { $sum: 1 } } }]),
    Shop.aggregate<{ _id: string; n: number }>([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: dayFmt, n: { $sum: 1 } } }]),
    User.aggregate<{ _id: string; n: number }>([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: dayFmt, n: { $sum: 1 } } }]),
    Order.aggregate<{ _id: unknown; gmvMinor: number; orders: number }>([
      { $match: countedOrder },
      { $group: { _id: '$shopId', gmvMinor: { $sum: '$totalMinor' }, orders: { $sum: 1 } } },
      { $sort: { gmvMinor: -1 } },
      { $limit: 10 },
    ]),
    Subscription.find({ status: 'ACTIVE' }).select('planId interval').lean(),
  ]);

  // MRR estimate: ACTIVE (paid) subscriptions only; yearly prices are divided by 12. Trials are excluded.
  const plans = await SubscriptionPlan.find({ _id: { $in: [...new Set(activeSubs.map((s) => String(s.planId)))] } }).lean();
  const planMap = new Map<string, ISubscriptionPlan>(plans.map((p) => [String(p._id), p]));
  let mrrMinor = 0;
  let payingShops = 0;
  for (const s of activeSubs) {
    const p = planMap.get(String(s.planId));
    if (!p) continue;
    const monthly = s.interval === 'YEARLY' ? p.priceMinor.YEARLY / 12 : p.priceMinor.MONTHLY;
    if (monthly > 0) {
      mrrMinor += monthly;
      payingShops += 1;
    }
  }

  const topShopDocs = await Shop.find({ _id: { $in: topRaw.map((t) => t._id) } }).select('name slug').lean();
  const topMap = new Map(topShopDocs.map((s) => [String(s._id), s]));
  const topShops = topRaw.map((t) => ({
    shopId: String(t._id),
    name: topMap.get(String(t._id))?.name ?? 'Unknown',
    slug: topMap.get(String(t._id))?.slug ?? null,
    gmvMinor: t.gmvMinor,
    orders: t.orders,
  }));

  return {
    totals: {
      shops: shopTotal,
      activeShops: shopActive,
      suspendedShops: shopSuspended,
      users: userTotal,
      products: productTotal,
      orders: orderTotal,
      gmvMinor: gmv[0]?.total ?? 0,
      mrrMinor: Math.round(mrrMinor),
      payingShops,
    },
    rangeDays: days,
    signups: { shops: dailySeries(shopSignups, from, days), users: dailySeries(userSignups, from, days) },
    topShops,
    shopsNearLimits: await shopsNearLimits(),
  };
}

async function shopsNearLimits() {
  const [subs, plans] = await Promise.all([Subscription.find().select('shopId planId limitOverrides').lean(), SubscriptionPlan.find().lean()]);
  const subMap = new Map(subs.map((s) => [String(s.shopId), s]));
  const planMap = new Map(plans.map((p) => [String(p._id), p]));
  const out: Array<{ shopId: string; name: string; slug: string; plan: ReturnType<typeof planBrief>; keys: Array<{ key: LimitKey; used: number; limit: number; percent: number }>; maxPercent: number }> = [];
  let scanned = 0;
  const cursor = Shop.find().select('name slug usage').lean().cursor();
  for await (const shop of cursor) {
    if (++scanned > NEAR_LIMIT_SCAN_CAP) break;
    const sub = subMap.get(String(shop._id));
    const plan = sub ? planMap.get(String(sub.planId)) : undefined;
    const limits = effectiveLimits(plan, sub?.limitOverrides);
    const hot = usageRows(shop.usage, limits).filter((r): r is typeof r & { limit: number } => r.limit !== null && r.percent >= NEAR_LIMIT_PERCENT);
    if (hot.length) out.push({ shopId: String(shop._id), name: shop.name, slug: shop.slug, plan: planBrief(plan), keys: hot.map((h) => ({ key: h.key, used: h.used, limit: h.limit, percent: h.percent })), maxPercent: Math.max(...hot.map((h) => h.percent)) });
  }
  return out.sort((a, b) => b.maxPercent - a.maxPercent).slice(0, 20);
}

export async function storageOverview(query: Record<string, unknown> & { q?: string }) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
  const filter = query.q ? { $or: [{ name: new RegExp(escapeRegex(query.q), 'i') }, { slug: new RegExp(escapeRegex(query.q), 'i') }] } : {};
  const [shops, total, totals] = await Promise.all([
    Shop.find(filter).sort({ 'usage.storageBytes': -1 }).skip(skip).limit(limit).select('name slug status usage').lean(),
    Shop.countDocuments(filter),
    Shop.aggregate<{ _id: null; storageBytes: number; images: number; videos: number; products: number }>([
      { $group: { _id: null, storageBytes: { $sum: '$usage.storageBytes' }, images: { $sum: '$usage.images' }, videos: { $sum: '$usage.videos' }, products: { $sum: '$usage.products' } } },
    ]),
  ]);
  const [subs] = [await Subscription.find({ shopId: { $in: shops.map((s) => s._id) } }).select('shopId planId limitOverrides').lean()];
  const plans = await SubscriptionPlan.find({ _id: { $in: subs.map((s) => s.planId) } }).lean();
  const subMap = new Map(subs.map((s) => [String(s.shopId), s]));
  const planMap = new Map(plans.map((p) => [String(p._id), p]));

  const items = shops.map((s) => {
    const sub = subMap.get(String(s._id));
    const plan = sub ? planMap.get(String(sub.planId)) : undefined;
    const limitBytes = effectiveLimits(plan, sub?.limitOverrides).storageBytes;
    const used = s.usage.storageBytes;
    return {
      shopId: String(s._id),
      name: s.name,
      slug: s.slug,
      status: s.status,
      plan: planBrief(plan),
      usedBytes: used,
      limitBytes,
      percent: limitBytes === null ? 0 : limitBytes === 0 ? 100 : Math.min(100, Math.round((used / limitBytes) * 100)),
      images: s.usage.images,
      videos: s.usage.videos,
    };
  });
  const t = totals[0];
  const topConsumers = page === 1 && !query.q ? items.slice(0, 10) : (await Shop.find().sort({ 'usage.storageBytes': -1 }).limit(10).select('name slug usage.storageBytes').lean()).map((s) => ({ shopId: String(s._id), name: s.name, slug: s.slug, usedBytes: s.usage.storageBytes }));
  return {
    items,
    meta: buildMeta(page, limit, total),
    totals: { usedBytes: t?.storageBytes ?? 0, images: t?.images ?? 0, videos: t?.videos ?? 0, products: t?.products ?? 0, shops: total },
    topConsumers,
  };
}

export const LIMIT_KEY_LIST: readonly LimitKey[] = LIMIT_KEYS;
