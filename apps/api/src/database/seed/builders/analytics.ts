import type { AnalyticsEventType } from '@vastra/shared';
import type { Types } from 'mongoose';
import { dayKey } from '@/common/utils/date';
import type { IAnalyticsDaily } from '@/database/models/analytics-daily.model';
import type { IAnalyticsEvent } from '@/database/models/analytics-event.model';
import type { IEnquiry } from '@/database/models/enquiry.model';
import type { IOrder } from '@/database/models/order.model';
import { DAY_MS, type Rng } from '../prng';
import type { BuiltProduct, ShopContext } from '../types';
import { idStr, newId } from '../util';

export interface AnalyticsPlan { daily: IAnalyticsDaily[]; events: IAnalyticsEvent[] }

const REFERRERS = ['direct', 'instagram', 'whatsapp', 'google'] as const;

/** 30 days of shop-level + per-product daily rollups, plus a sample of raw events. Mutates product view/share counters. */
export function planAnalytics(ctx: ShopContext, rng: Rng, now: Date, built: BuiltProduct[], orders: IOrder[], enquiries: IEnquiry[], catalogueIds: Types.ObjectId[]): AnalyticsPlan {
  const sellable = built.filter((b) => b.product.status !== 'DRAFT');
  const live = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED');
  const ordersByDay = new Map<string, IOrder[]>();
  for (const o of live) ordersByDay.set(dayKey(o.createdAt), [...(ordersByDay.get(dayKey(o.createdAt)) ?? []), o]);
  const enqByDay = new Map<string, number>();
  for (const e of enquiries) enqByDay.set(dayKey(e.createdAt), (enqByDay.get(dayKey(e.createdAt)) ?? 0) + 1);

  const daily: IAnalyticsDaily[] = [];
  const events: IAnalyticsEvent[] = [];
  let visitorSeq = 0;

  for (let d = 29; d >= 0; d--) {
    const day = new Date(now.getTime() - d * DAY_MS);
    const key = dayKey(day);
    const dow = day.getUTCDay();
    const visitors = Math.round(rng.int(45, 150) * (dow === 0 || dow === 6 ? 1.35 : 1) * (1 + (29 - d) / 120));
    const dayOrders = ordersByDay.get(key) ?? [];
    const orderCount = dayOrders.length;
    const productViews = Math.round(visitors * 2.4);
    const addToCart = Math.max(Math.round(productViews * 0.12), orderCount * 2);
    const checkout = Math.min(addToCart, Math.max(Math.round(addToCart * 0.45), orderCount + 1));
    const counts: Record<string, number> = {
      SHOP_VIEW: visitors, CATALOGUE_VIEW: Math.round(visitors * 0.5), PRODUCT_VIEW: productViews, PRODUCT_SHARE: Math.round(visitors * 0.08),
      WHATSAPP_CLICK: Math.round(visitors * 0.12), ENQUIRY: enqByDay.get(key) ?? 0, ADD_TO_CART: addToCart, CHECKOUT_START: checkout, ORDER: orderCount,
    };
    daily.push({
      _id: newId(), shopId: ctx.shopId, date: key, productId: null, counts, uniqueVisitors: Math.round(visitors * 0.78), ordersCount: orderCount,
      revenueMinor: dayOrders.reduce((n, o) => n + o.totalMinor, 0), updatedAt: day,
    });

    for (const b of rng.sample(sellable, 6)) {
      const views = rng.int(5, 40);
      const shares = rng.chance(0.2) ? rng.int(1, 3) : 0;
      b.product.viewCount += views;
      b.product.shareCount += shares;
      const pc: Record<string, number> = { PRODUCT_VIEW: views, ADD_TO_CART: rng.int(0, 6) };
      if (shares) pc.PRODUCT_SHARE = shares;
      daily.push({ _id: newId(), shopId: ctx.shopId, date: key, productId: b.product._id, counts: pc, uniqueVisitors: Math.round(views * 0.8), ordersCount: 0, revenueMinor: 0, updatedAt: day });
    }

    // Raw event sample (a handful per day).
    const nEvents = rng.int(3, 6);
    for (let n = 0; n < nEvents; n++) {
      const type = rng.weighted<AnalyticsEventType>([['SHOP_VIEW', 20], ['PRODUCT_VIEW', 40], ['CATALOGUE_VIEW', 12], ['PRODUCT_SHARE', 5], ['WHATSAPP_CLICK', 8], ['ADD_TO_CART', 10], ['CHECKOUT_START', 5]]);
      const at = new Date(Math.min(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), rng.int(8, 23), rng.int(0, 59)), now.getTime() - 1000));
      const product = type === 'PRODUCT_VIEW' || type === 'PRODUCT_SHARE' || type === 'ADD_TO_CART' || type === 'WHATSAPP_CLICK' ? rng.pick(sellable).product._id : null;
      const cat = type === 'CATALOGUE_VIEW' && catalogueIds.length ? rng.pick(catalogueIds) : null;
      visitorSeq += 1;
      events.push({
        _id: newId(), shopId: ctx.shopId, type, productId: product, catalogueId: cat ?? null, orderId: null, visitorId: `v_${ctx.def.slug}_${visitorSeq}`,
        sessionId: `s_${ctx.def.slug}_${visitorSeq}`, referrer: rng.pick(REFERRERS), device: rng.weighted([['mobile', 70], ['desktop', 25], ['tablet', 5]] as const), createdAt: at,
      });
    }
  }
  for (const o of live.filter((x) => now.getTime() - x.createdAt.getTime() < 30 * DAY_MS)) {
    events.push({
      _id: newId(), shopId: ctx.shopId, type: 'ORDER', productId: null, catalogueId: null, orderId: o._id, visitorId: `v_${idStr(o._id)}`, sessionId: `s_${idStr(o._id)}`,
      referrer: 'direct', device: 'mobile', meta: { orderNumber: o.orderNumber, totalMinor: o.totalMinor, source: o.source }, createdAt: o.createdAt,
    });
  }
  return { daily, events };
}
