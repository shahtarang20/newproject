import { Types, type PipelineStage } from 'mongoose';
import { ANALYTICS_EVENT_TYPES, type AnalyticsEventType } from '@vastra/shared';
import { logger } from '@/config/logger';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/config/constants';
import { Errors } from '@/common/errors';
import { TtlCache } from '@/common/utils/cache';
import { addDays, dayKey, startOfUtcDay } from '@/common/utils/date';
import { buildMeta } from '@/common/pagination';
import { AnalyticsDaily, AnalyticsEvent, Category, Customer, Enquiry, Order, Product, ProductVariant, Shop } from '@/database/models';
import type { ProductsQuery, RangeQuery, SalesQuery } from './analytics.schemas';
import { getStockHealth } from '@/modules/inventory/inventory.query.service';

// ------------------------------------------------------------------ recording
export interface RecordEventInput {
  type: AnalyticsEventType;
  productId?: string;
  catalogueId?: string;
  sessionId?: string;
  meta?: Record<string, unknown>;
}

const DEDUPE_TYPES: readonly AnalyticsEventType[] = ['PRODUCT_VIEW', 'CATALOGUE_VIEW'];
const DEDUPE_TTL_MS = 30 * 60 * 1000;
const dedupe = new TtlCache<true>(20_000, DEDUPE_TTL_MS);

const validId = (v?: string): Types.ObjectId | null => (v && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : null);

async function bumpDaily(shopId: Types.ObjectId, productId: Types.ObjectId | null, date: string, inc: Record<string, number>): Promise<void> {
  const run = (): Promise<unknown> => AnalyticsDaily.updateOne({ shopId, date, productId }, { $inc: inc }, { upsert: true });
  try {
    await run();
  } catch (err) {
    // concurrent upsert race on the unique {shopId,date,productId} index → retry once as a plain update
    if ((err as { code?: number }).code === 11000) await run();
    else throw err;
  }
}

/**
 * Records an analytics event. Cheap, never throws. Callers in hot paths must NOT await it
 * (`void recordEvent(...)`). Dedupes PRODUCT_VIEW/CATALOGUE_VIEW per session+entity for 30 minutes.
 * Maintains AnalyticsDaily rollups (shop-level row + per-product row) so dashboards never scan raw events.
 */
export async function recordEvent(shopId: string, e: RecordEventInput): Promise<void> {
  try {
    const shop = validId(shopId);
    if (!shop || !(ANALYTICS_EVENT_TYPES as readonly string[]).includes(e.type)) return;
    const productId = validId(e.productId);
    const catalogueId = validId(e.catalogueId);
    if ((e.productId && !productId) || (e.catalogueId && !catalogueId)) return;

    if (e.sessionId && DEDUPE_TYPES.includes(e.type)) {
      const key = `${shopId}:${e.sessionId.slice(0, 80)}:${e.type}:${productId ?? catalogueId ?? ''}`;
      if (dedupe.get(key)) return;
      dedupe.set(key, true);
    }

    const now = new Date();
    const date = dayKey(now);
    const inc: Record<string, number> = { [`counts.${e.type}`]: 1 };
    if (e.type === 'ORDER') {
      inc.ordersCount = 1;
      const total = e.meta?.totalMinor;
      if (typeof total === 'number' && Number.isFinite(total)) inc.revenueMinor = Math.round(total);
    }

    const meta = e.meta && JSON.stringify(e.meta).length <= 2000 ? e.meta : undefined;
    await Promise.all([
      AnalyticsEvent.create({
        shopId: shop,
        type: e.type,
        productId,
        catalogueId,
        sessionId: e.sessionId?.slice(0, 80),
        meta,
        createdAt: now,
      }),
      bumpDaily(shop, null, date, inc),
      productId ? bumpDaily(shop, productId, date, { [`counts.${e.type}`]: 1 }) : Promise.resolve(),
    ]);
  } catch (err) {
    logger.warn({ err, type: e.type }, 'analytics recordEvent failed');
  }
}

// ------------------------------------------------------------------ range helpers
export interface DateRange {
  from: Date; // inclusive, UTC midnight
  to: Date; // exclusive, UTC midnight
  days: number;
  prevFrom: Date;
  prevTo: Date;
}

const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

export function resolveRange(q: Partial<Pick<RangeQuery, 'range' | 'from' | 'to'>>): DateRange {
  let from: Date;
  let to: Date;
  if (q.from && q.to) {
    from = new Date(`${q.from}T00:00:00.000Z`);
    to = addDays(new Date(`${q.to}T00:00:00.000Z`), 1);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw Errors.badRequest('VALIDATION_ERROR', 'Invalid date range');
  } else {
    const days = RANGE_DAYS[q.range ?? '30d'] ?? 30;
    to = addDays(startOfUtcDay(), 1);
    from = addDays(to, -days);
  }
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (days > 366) throw Errors.badRequest('VALIDATION_ERROR', 'Date range cannot exceed 366 days');
  return { from, to, days, prevFrom: addDays(from, -days), prevTo: from };
}

const dayKeys = (r: DateRange): string[] => Array.from({ length: r.days }, (_, i) => dayKey(addDays(r.from, i)));
const pct = (cur: number, prev: number): number | null => (prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 1000) / 10);

/** Orders that count toward sales. */
const SALES_MATCH = { status: { $nin: ['CANCELLED', 'REJECTED'] } };

interface Totals {
  revenueMinor: number;
  orders: number;
}

async function orderTotals(shopId: Types.ObjectId, from: Date, to: Date): Promise<Totals> {
  const [r] = await Order.aggregate<{ revenueMinor: number; orders: number }>([
    { $match: { shopId, createdAt: { $gte: from, $lt: to }, ...SALES_MATCH } },
    { $group: { _id: null, revenueMinor: { $sum: '$totalMinor' }, orders: { $sum: 1 } } },
  ]);
  return { revenueMinor: r?.revenueMinor ?? 0, orders: r?.orders ?? 0 };
}

async function dailyOrderSeries(shopId: Types.ObjectId, r: DateRange): Promise<Map<string, Totals>> {
  const rows = await Order.aggregate<{ _id: string; revenueMinor: number; orders: number }>([
    { $match: { shopId, createdAt: { $gte: r.from, $lt: r.to }, ...SALES_MATCH } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
        revenueMinor: { $sum: '$totalMinor' },
        orders: { $sum: 1 },
      },
    },
  ]);
  return new Map(rows.map((x) => [x._id, { revenueMinor: x.revenueMinor, orders: x.orders }]));
}

interface ProductAgg {
  productId: Types.ObjectId;
  name: string;
  imageUrl?: string;
  quantity: number;
  revenueMinor: number;
  orders: number;
}

function productSalesPipeline(shopId: Types.ObjectId, from: Date, to: Date): PipelineStage[] {
  return [
    { $match: { shopId, createdAt: { $gte: from, $lt: to }, ...SALES_MATCH } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        imageUrl: { $first: '$items.imageUrl' },
        quantity: { $sum: '$items.qty' },
        revenueMinor: { $sum: '$items.lineTotalMinor' },
        orderIds: { $addToSet: '$_id' },
      },
    },
    { $project: { productId: '$_id', _id: 0, name: 1, imageUrl: 1, quantity: 1, revenueMinor: 1, orders: { $size: '$orderIds' } } },
  ];
}

// ------------------------------------------------------------------ dashboard
export async function getDashboard(shopId: string, range: '7d' | '30d' | '90d') {
  const shop = new Types.ObjectId(shopId);
  const r = resolveRange({ range });
  const todayStart = startOfUtcDay();
  const tomorrow = addDays(todayStart, 1);

  const shopDoc = await Shop.findById(shop).select('notificationSettings.lowStockThreshold currency').lean();
  const lowThreshold = shopDoc?.notificationSettings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

  const [today, current, previous, pending, customers, products, stockHealth, series, topProducts, recentOrders, recentEnquiries, topCategories] =
    await Promise.all([
      orderTotals(shop, todayStart, tomorrow),
      orderTotals(shop, r.from, r.to),
      orderTotals(shop, r.prevFrom, r.prevTo),
      Order.countDocuments({ shopId: shop, status: 'PENDING' }),
      Customer.countDocuments({ shopId: shop }),
      Product.countDocuments({ shopId: shop, deletedAt: null }),
      // Same pipeline as the Inventory page, so "low" (variant -> product -> shop threshold) matches there exactly.
      getStockHealth(shop, lowThreshold),
      dailyOrderSeries(shop, r),
      Order.aggregate<ProductAgg>([...productSalesPipeline(shop, r.from, r.to), { $sort: { revenueMinor: -1 } }, { $limit: 5 }]),
      Order.find({ shopId: shop })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber customerSnapshot totalMinor status paymentStatus createdAt')
        .lean(),
      Enquiry.find({ shopId: shop }).sort({ createdAt: -1 }).limit(5).select('name phone message status productId createdAt').lean(),
      topCategoriesAgg(shop, r),
    ]);

  const keys = dayKeys(r);
  const salesOverTime = keys.map((date) => ({ date, revenueMinor: series.get(date)?.revenueMinor ?? 0 }));
  const ordersOverTime = keys.map((date) => ({ date, orders: series.get(date)?.orders ?? 0 }));

  return {
    range,
    currency: shopDoc?.currency ?? 'INR',
    from: dayKey(r.from),
    to: dayKey(addDays(r.to, -1)),
    todaySalesMinor: today.revenueMinor,
    todayOrders: today.orders,
    pendingOrders: pending,
    totalCustomers: customers,
    productsCount: products,
    lowStockCount: stockHealth.lowStock,
    outOfStockCount: stockHealth.outOfStock,
    revenue: {
      totalMinor: current.revenueMinor,
      previousMinor: previous.revenueMinor,
      deltaPercent: pct(current.revenueMinor, previous.revenueMinor),
      orders: current.orders,
      previousOrders: previous.orders,
      ordersDeltaPercent: pct(current.orders, previous.orders),
    },
    topProducts,
    recentOrders: recentOrders.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      customerName: o.customerSnapshot?.name,
      totalMinor: o.totalMinor,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    })),
    recentEnquiries: recentEnquiries.map((q) => ({
      id: String(q._id),
      name: q.name,
      phone: q.phone,
      message: q.message,
      status: q.status,
      productId: q.productId ? String(q.productId) : null,
      createdAt: q.createdAt,
    })),
    salesOverTime,
    ordersOverTime,
    topCategories,
  };
}

async function topCategoriesAgg(shopId: Types.ObjectId, r: DateRange) {
  const rows = await Order.aggregate<{ _id: Types.ObjectId | null; revenueMinor: number; quantity: number }>([
    { $match: { shopId, createdAt: { $gte: r.from, $lt: r.to }, ...SALES_MATCH } },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', revenueMinor: { $sum: '$items.lineTotalMinor' }, quantity: { $sum: '$items.qty' } } },
    { $lookup: { from: Product.collection.name, localField: '_id', foreignField: '_id', as: 'p' } },
    { $set: { categoryId: { $ifNull: [{ $arrayElemAt: ['$p.categoryId', 0] }, null] } } },
    { $group: { _id: '$categoryId', revenueMinor: { $sum: '$revenueMinor' }, quantity: { $sum: '$quantity' } } },
    { $sort: { revenueMinor: -1 } },
    { $limit: 5 },
  ]);
  const ids = rows.map((x) => x._id).filter((x): x is Types.ObjectId => !!x);
  const cats = ids.length ? await Category.find({ shopId, _id: { $in: ids } }).select('name').lean() : [];
  const names = new Map(cats.map((c) => [String(c._id), c.name]));
  return rows.map((x) => ({
    categoryId: x._id ? String(x._id) : null,
    name: x._id ? (names.get(String(x._id)) ?? 'Unknown') : 'Uncategorised',
    revenueMinor: x.revenueMinor,
    quantity: x.quantity,
  }));
}

// ------------------------------------------------------------------ sales
const weekStart = (key: string): string => {
  const d = new Date(`${key}T00:00:00.000Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return dayKey(addDays(d, -dow));
};
const bucketKey = (key: string, g: 'day' | 'week' | 'month'): string => (g === 'day' ? key : g === 'week' ? weekStart(key) : `${key.slice(0, 7)}-01`);

export async function getSales(shopId: string, q: SalesQuery) {
  const shop = new Types.ObjectId(shopId);
  const r = resolveRange(q);
  const [series, previous, byMethod, byStatus] = await Promise.all([
    dailyOrderSeries(shop, r),
    orderTotals(shop, r.prevFrom, r.prevTo),
    Order.aggregate<{ _id: string; orders: number; revenueMinor: number }>([
      { $match: { shopId: shop, createdAt: { $gte: r.from, $lt: r.to }, ...SALES_MATCH } },
      { $group: { _id: '$paymentMethod', orders: { $sum: 1 }, revenueMinor: { $sum: '$totalMinor' } } },
    ]),
    Order.aggregate<{ _id: string; orders: number; revenueMinor: number }>([
      { $match: { shopId: shop, createdAt: { $gte: r.from, $lt: r.to } } },
      { $group: { _id: '$status', orders: { $sum: 1 }, revenueMinor: { $sum: '$totalMinor' } } },
    ]),
  ]);

  const buckets = new Map<string, Totals>();
  for (const date of dayKeys(r)) {
    const k = bucketKey(date, q.groupBy);
    const b = buckets.get(k) ?? { revenueMinor: 0, orders: 0 };
    const d = series.get(date);
    if (d) {
      b.revenueMinor += d.revenueMinor;
      b.orders += d.orders;
    }
    buckets.set(k, b);
  }
  const rows = [...buckets.entries()].map(([date, v]) => ({ date, revenueMinor: v.revenueMinor, orders: v.orders }));
  const revenueMinor = rows.reduce((s, x) => s + x.revenueMinor, 0);
  const orders = rows.reduce((s, x) => s + x.orders, 0);
  return {
    groupBy: q.groupBy,
    from: dayKey(r.from),
    to: dayKey(addDays(r.to, -1)),
    series: rows,
    totals: {
      revenueMinor,
      orders,
      averageOrderValueMinor: orders ? Math.round(revenueMinor / orders) : 0,
      previousRevenueMinor: previous.revenueMinor,
      previousOrders: previous.orders,
      revenueDeltaPercent: pct(revenueMinor, previous.revenueMinor),
      ordersDeltaPercent: pct(orders, previous.orders),
    },
    paymentMethodSplit: byMethod.map((x) => ({ method: x._id, orders: x.orders, revenueMinor: x.revenueMinor })),
    statusSplit: byStatus.map((x) => ({ status: x._id, orders: x.orders, revenueMinor: x.revenueMinor })),
  };
}

// ------------------------------------------------------------------ product breakdown
export async function getProductsAnalytics(shopId: string, q: ProductsQuery) {
  const shop = new Types.ObjectId(shopId);
  const r = resolveRange(q);
  const [events, sales] = await Promise.all([
    AnalyticsDaily.aggregate<{ _id: Types.ObjectId; views: number; addToCart: number }>([
      { $match: { shopId: shop, productId: { $ne: null }, date: { $gte: dayKey(r.from), $lt: dayKey(r.to) } } },
      {
        $group: {
          _id: '$productId',
          views: { $sum: { $ifNull: ['$counts.PRODUCT_VIEW', 0] } },
          addToCart: { $sum: { $ifNull: ['$counts.ADD_TO_CART', 0] } },
        },
      },
    ]),
    Order.aggregate<ProductAgg>(productSalesPipeline(shop, r.from, r.to)),
  ]);

  interface Row {
    productId: string;
    name?: string;
    imageUrl?: string;
    views: number;
    addToCart: number;
    orders: number;
    quantity: number;
    revenueMinor: number;
  }
  const map = new Map<string, Row>();
  const get = (id: Types.ObjectId): Row => {
    const k = String(id);
    let row = map.get(k);
    if (!row) {
      row = { productId: k, views: 0, addToCart: 0, orders: 0, quantity: 0, revenueMinor: 0 };
      map.set(k, row);
    }
    return row;
  };
  for (const e of events) Object.assign(get(e._id), { views: e.views, addToCart: e.addToCart });
  for (const s of sales) Object.assign(get(s.productId), { orders: s.orders, quantity: s.quantity, revenueMinor: s.revenueMinor, name: s.name, imageUrl: s.imageUrl });

  const dir = q.order === 'asc' ? 1 : -1;
  const key = q.sort === 'revenue' ? 'revenueMinor' : q.sort;
  const all = [...map.values()].sort((a, b) => dir * (a[key] - b[key]) || b.views - a.views);
  const total = all.length;
  const pageRows = all.slice((q.page - 1) * q.limit, q.page * q.limit);

  const prods = await Product.find({ shopId: shop, _id: { $in: pageRows.map((x) => new Types.ObjectId(x.productId)) } })
    .select('name primaryThumbUrl primaryImageUrl')
    .lean();
  const info = new Map(prods.map((p) => [String(p._id), p]));
  const items = pageRows.map((x) => {
    const p = info.get(x.productId);
    return {
      ...x,
      name: p?.name ?? x.name ?? 'Deleted product',
      imageUrl: p?.primaryThumbUrl ?? p?.primaryImageUrl ?? x.imageUrl ?? null,
      conversionPercent: x.views ? Math.round((x.orders / x.views) * 1000) / 10 : 0,
    };
  });
  return { items, meta: buildMeta(q.page, q.limit, total), from: dayKey(r.from), to: dayKey(addDays(r.to, -1)) };
}

// ------------------------------------------------------------------ funnel
export async function getFunnel(shopId: string, q: RangeQuery) {
  const shop = new Types.ObjectId(shopId);
  const r = resolveRange(q);
  const [counts, orders] = await Promise.all([
    AnalyticsDaily.aggregate<Record<string, number>>([
      { $match: { shopId: shop, productId: null, date: { $gte: dayKey(r.from), $lt: dayKey(r.to) } } },
      {
        $group: {
          _id: null,
          ...Object.fromEntries(ANALYTICS_EVENT_TYPES.map((t) => [t, { $sum: { $ifNull: [`$counts.${t}`, 0] } }])),
        },
      },
    ]),
    orderTotals(shop, r.from, r.to),
  ]);
  const c = counts[0] ?? {};
  const n = (t: AnalyticsEventType): number => c[t] ?? 0;
  const steps = [
    { step: 'CATALOGUE_VIEW', count: n('CATALOGUE_VIEW') },
    { step: 'PRODUCT_VIEW', count: n('PRODUCT_VIEW') },
    { step: 'ADD_TO_CART', count: n('ADD_TO_CART') },
    { step: 'CHECKOUT_START', count: n('CHECKOUT_START') },
    { step: 'ORDER', count: orders.orders },
  ];
  const funnel = steps.map((s, i) => ({
    ...s,
    /** conversion from the previous step (null for the first) */
    conversionFromPreviousPercent: i === 0 ? null : steps[i - 1].count ? Math.round((s.count / steps[i - 1].count) * 1000) / 10 : 0,
    conversionFromStartPercent: steps[0].count ? Math.round((s.count / steps[0].count) * 1000) / 10 : 0,
  }));
  return {
    from: dayKey(r.from),
    to: dayKey(addDays(r.to, -1)),
    funnel,
    engagement: { SHOP_VIEW: n('SHOP_VIEW'), WHATSAPP_CLICK: n('WHATSAPP_CLICK'), PRODUCT_SHARE: n('PRODUCT_SHARE'), ENQUIRY: n('ENQUIRY') },
  };
}
