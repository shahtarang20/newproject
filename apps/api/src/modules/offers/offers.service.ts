import { Types, type ClientSession } from 'mongoose';
import type { DiscountType } from '@vastra/shared';
import { AppError, Errors } from '@/common/errors';
import { percentOf } from '@/common/utils/money';
import { normalisePhone } from '@/common/utils/phone';
import { Coupon, type ICoupon } from '@/database/models/coupon.model';
import { Offer, type IOffer } from '@/database/models/offer.model';
import { Order } from '@/database/models/order.model';

/** Mirrors apps/web/src/types/storefront.ts PublicOffer. */
export interface PublicOffer {
  id: string;
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  couponCode?: string;
  minOrderMinor?: number;
  endDate?: string;
}

const now = (): Date => new Date();

/** Auto-applied offers that are active right now (dates + isActive). */
async function findLiveOffers(shopId: string | Types.ObjectId): Promise<IOffer[]> {
  const t = now();
  return Offer.find({
    shopId: new Types.ObjectId(String(shopId)),
    isActive: true,
    $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: t } }] }, { $or: [{ endsAt: null }, { endsAt: { $gte: t } }] }],
  })
    .sort({ createdAt: -1 })
    .lean<IOffer[]>();
}

/** Public list used by the storefront. `discountValue` is percent for PERCENT, minor units for FLAT, 0 for BUY_X_GET_Y. */
export async function getActiveOffers(shopId: string): Promise<PublicOffer[]> {
  const offers = await findLiveOffers(shopId);
  return offers.map((o) => ({
    id: String(o._id),
    name: o.name,
    description: o.description,
    discountType: o.discountType,
    discountValue: o.value,
    minOrderMinor: o.minOrderMinor || undefined,
    endDate: o.endsAt ? new Date(o.endsAt).toISOString() : undefined,
  }));
}

// ------------------------------------------------------------------ discount maths

export interface DiscountLine {
  productId: string;
  categoryId?: string | null;
  unitPriceMinor: number;
  qty: number;
}

interface Rule {
  discountType: DiscountType;
  value: number;
  maxDiscountMinor?: number | null;
  buyQty?: number;
  getQty?: number;
}

/** Splits `total` across `caps` proportionally (integer-safe), never exceeding a line's cap. */
function allocate(total: number, caps: number[]): number[] {
  const sum = caps.reduce((a, b) => a + b, 0);
  const out = caps.map(() => 0);
  if (total <= 0 || sum <= 0) return out;
  const t = Math.min(total, sum);
  let given = 0;
  caps.forEach((c, i) => {
    out[i] = Math.min(c, Math.floor((t * c) / sum));
    given += out[i];
  });
  let left = t - given;
  for (let i = caps.length - 1; i >= 0 && left > 0; i -= 1) {
    const room = caps[i] - out[i];
    const add = Math.min(room, left);
    out[i] += add;
    left -= add;
  }
  return out;
}

/**
 * Per-line discounts of one rule. `net[i]` is the amount still payable for line i (discountable ceiling);
 * `eligible[i]` says whether the rule applies to the line.
 * - PERCENT: value% of the eligible net amount.
 * - FLAT: `value` minor units off the eligible lines in total (proportional split).
 * - BUY_X_GET_Y: per line, for every (buyQty+getQty) units, getQty units are free (unit price * free units).
 * `maxDiscountMinor` caps the rule's total (scaled proportionally).
 */
function ruleDiscounts(rule: Rule, lines: DiscountLine[], net: number[], eligible: boolean[]): number[] {
  let d = lines.map((l, i) => {
    if (!eligible[i] || net[i] <= 0) return 0;
    if (rule.discountType === 'PERCENT') return Math.min(net[i], percentOf(net[i], Math.min(100, rule.value)));
    if (rule.discountType === 'BUY_X_GET_Y') {
      const buy = Math.max(1, rule.buyQty ?? 1);
      const get = Math.max(1, rule.getQty ?? 1);
      const free = Math.floor(l.qty / (buy + get)) * get;
      return Math.min(net[i], free * l.unitPriceMinor);
    }
    return 0;
  });
  if (rule.discountType === 'FLAT') {
    d = allocate(
      rule.value,
      net.map((n, i) => (eligible[i] ? Math.max(0, n) : 0)),
    );
  }
  const total = d.reduce((a, b) => a + b, 0);
  if (rule.maxDiscountMinor != null && total > rule.maxDiscountMinor) d = allocate(rule.maxDiscountMinor, d);
  return d;
}

// ------------------------------------------------------------------ coupons

const couponInvalid = (message: string): AppError => Errors.badRequest('COUPON_INVALID', message);

/**
 * Validates a coupon code for a shop. Throws 400 COUPON_INVALID with a user-friendly message.
 * `subtotalMinor` is the cart amount after automatic offers; `phone` enables the per-customer limit check.
 */
export async function validateCoupon(
  shopId: string,
  code: string,
  opts: { subtotalMinor: number; phone?: string },
): Promise<ICoupon> {
  const normalised = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ shopId: new Types.ObjectId(shopId), code: normalised }).lean<ICoupon>();
  if (!coupon || !coupon.isActive) throw couponInvalid('This coupon code is not valid');
  const t = now();
  if (coupon.startsAt && coupon.startsAt > t) throw couponInvalid('This coupon is not active yet');
  if (coupon.endsAt && coupon.endsAt < t) throw couponInvalid('This coupon has expired');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw couponInvalid('This coupon has reached its usage limit');
  if (coupon.minOrderMinor > 0 && opts.subtotalMinor < coupon.minOrderMinor)
    throw couponInvalid(`Add items worth ${(coupon.minOrderMinor / 100).toFixed(2)} or more to use this coupon`);
  if (coupon.perCustomerLimit != null && opts.phone) {
    const used = await Order.countDocuments({
      shopId: coupon.shopId,
      couponId: coupon._id,
      'customerSnapshot.phone': normalisePhone(opts.phone),
      status: { $nin: ['CANCELLED', 'REJECTED'] },
    });
    if (used >= coupon.perCustomerLimit) throw couponInvalid('You have already used this coupon the maximum number of times');
  }
  return coupon;
}

/** Atomically consumes one use of a coupon (respecting usageLimit). Returns false when the limit was hit meanwhile. */
export async function claimCoupon(shopId: string, couponId: string | Types.ObjectId, session?: ClientSession): Promise<boolean> {
  const res = await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      shopId: new Types.ObjectId(shopId),
      isActive: true,
      $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
    },
    { $inc: { usedCount: 1 } },
    { new: true, session },
  ).lean();
  return Boolean(res);
}

/** Gives a coupon use back (order cancelled / rollback). Never goes below zero. */
export async function releaseCoupon(shopId: string, couponId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
  await Coupon.updateOne({ _id: couponId, shopId: new Types.ObjectId(shopId), usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
}

// ------------------------------------------------------------------ best offers + coupon

export interface DiscountResult {
  /** Automatic-offer discount per input line (best single offer per line; offers never stack on one line). */
  offerDiscounts: number[];
  /** Coupon discount per input line, computed on the amount left after offers. */
  couponDiscounts: number[];
  appliedOffers: Array<{ id: string; name: string }>;
  /** Present only when a code was supplied. `id` set when valid. */
  coupon?: { code: string; valid: boolean; message?: string; id?: string };
}

/**
 * Applies the best automatic offer per line, then (optionally) a coupon on what remains.
 * Never throws for an invalid coupon — it is reported in `coupon` (callers decide). Total discount per line is
 * clamped to the line amount.
 */
export async function applyBestOffersAndCoupon(
  shopId: string,
  lines: DiscountLine[],
  couponCode?: string,
  opts: { phone?: string } = {},
): Promise<DiscountResult> {
  const gross = lines.map((l) => l.unitPriceMinor * l.qty);
  const grossTotal = gross.reduce((a, b) => a + b, 0);
  const offerDiscounts = lines.map(() => 0);
  const bestOfferIdx = lines.map(() => -1);

  const offers = lines.length ? await findLiveOffers(shopId) : [];
  offers.forEach((o, oi) => {
    if (grossTotal < (o.minOrderMinor ?? 0)) return;
    const eligible = lines.map((l) => {
      if (o.scope === 'PRODUCTS') return o.productIds.some((p) => String(p) === l.productId);
      if (o.scope === 'CATEGORIES') return Boolean(l.categoryId) && o.categoryIds.some((c) => String(c) === l.categoryId);
      return true;
    });
    const d = ruleDiscounts(o, lines, gross, eligible);
    d.forEach((amount, i) => {
      if (amount > offerDiscounts[i]) {
        offerDiscounts[i] = amount;
        bestOfferIdx[i] = oi;
      }
    });
  });
  const appliedIdx = [...new Set(bestOfferIdx.filter((i) => i >= 0))];
  const appliedOffers = appliedIdx.map((i) => ({ id: String(offers[i]._id), name: offers[i].name }));

  const result: DiscountResult = { offerDiscounts, couponDiscounts: lines.map(() => 0), appliedOffers };
  if (!couponCode?.trim()) return result;

  const net = gross.map((g, i) => g - offerDiscounts[i]);
  const netTotal = net.reduce((a, b) => a + b, 0);
  try {
    const coupon = await validateCoupon(shopId, couponCode, { subtotalMinor: netTotal, phone: opts.phone });
    result.couponDiscounts = ruleDiscounts(coupon, lines, net, lines.map(() => true));
    const total = result.couponDiscounts.reduce((a, b) => a + b, 0);
    result.coupon = { code: coupon.code, valid: true, id: String(coupon._id), message: total > 0 ? undefined : 'Coupon applied but gives no discount on this cart' };
  } catch (err) {
    if (err instanceof AppError && err.code === 'COUPON_INVALID') {
      result.coupon = { code: couponCode.trim().toUpperCase(), valid: false, message: err.message };
    } else {
      throw err;
    }
  }
  return result;
}
