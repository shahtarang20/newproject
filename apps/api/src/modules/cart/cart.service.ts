import { Types } from 'mongoose';
import type { DeliveryType } from '@vastra/shared';
import { Errors } from '@/common/errors';
import { clampMinor, inclusiveTax } from '@/common/utils/money';
import { Product, type IProduct } from '@/database/models/product.model';
import { ProductVariant, type IProductVariant } from '@/database/models/product-variant.model';
import { Shop, type IShop } from '@/database/models/shop.model';
import { applyBestOffersAndCoupon } from '@/modules/offers/offers.service';

/**
 * Server-authoritative cart pricing.
 *
 * TAX POLICY (consistent everywhere, incl. orders): selling prices are TAX-INCLUSIVE (Indian retail MRP convention).
 * `product.pricing.taxPercent` is therefore only a breakdown: `taxMinor = tax contained in (line amount - discount)`.
 * It is NOT added on top: totalMinor = subtotalMinor - discountMinor + shippingMinor.
 * Discounts are applied before the tax breakdown (tax is computed on the discounted amount).
 *
 * SHIPPING: DELIVERY = shop.shippingSettings.flatRateMinor, free when (subtotal - discount) >= freeAboveMinor (if set).
 * PICKUP = 0. Empty/all-unavailable cart = 0.
 */

// Mirrors apps/web/src/types/storefront.ts (PricedCart / PricedCartLine).
export type CartIssue = 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'UNAVAILABLE' | 'PRICE_HIDDEN';
export interface PricedCartLine {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  imageUrl?: string;
  colour?: string;
  size?: string;
  sku: string;
  unitPriceMinor: number;
  mrpMinor?: number;
  quantity: number;
  lineTotalMinor: number;
  available: boolean;
  maxQuantity: number;
  issue?: CartIssue;
}
export interface PricedCart {
  lines: PricedCartLine[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  coupon?: { code: string; valid: boolean; message?: string };
  currency: string;
}

export interface CartInput {
  items: Array<{ productId: string; variantId: string; quantity: number }>;
  couponCode?: string;
}

/** Internal per-line data the order engine needs (never exposed publicly). */
export interface InternalLine extends PricedCartLine {
  categoryId?: string | null;
  taxPercent: number;
  taxMinor: number;
  discountMinor: number;
  stock: number;
}

export interface PricingResult {
  cart: PricedCart;
  lines: InternalLine[];
  couponId?: string;
  appliedOffers: Array<{ id: string; name: string }>;
  deliveryType: DeliveryType;
}

type ShopForPricing = Pick<IShop, 'shippingSettings' | 'currency'> & { _id: Types.ObjectId };

const VALID_ID = /^[a-f\d]{24}$/i;

export function shippingFor(shop: Pick<IShop, 'shippingSettings'>, deliveryType: DeliveryType, payableMinor: number): number {
  if (deliveryType === 'PICKUP' || payableMinor <= 0) return 0;
  const { flatRateMinor, freeAboveMinor } = shop.shippingSettings;
  if (freeAboveMinor != null && payableMinor >= freeAboveMinor) return 0;
  return clampMinor(flatRateMinor);
}

/** Core engine, shared with orders.service. Never throws for bad lines/coupons — they are flagged. */
export async function computePricing(
  shop: ShopForPricing,
  input: CartInput,
  opts: { deliveryType?: DeliveryType; phone?: string } = {},
): Promise<PricingResult> {
  const shopId = String(shop._id);
  const deliveryType: DeliveryType = opts.deliveryType ?? (shop.shippingSettings.deliveryEnabled ? 'DELIVERY' : 'PICKUP');

  // Merge duplicate variant lines (sum quantity).
  const merged = new Map<string, { productId: string; variantId: string; quantity: number }>();
  for (const it of input.items) {
    const key = it.variantId;
    const prev = merged.get(key);
    if (prev) prev.quantity += it.quantity;
    else merged.set(key, { ...it });
  }
  const items = [...merged.values()];

  const validVariantIds = items.filter((i) => VALID_ID.test(i.variantId)).map((i) => new Types.ObjectId(i.variantId));
  const variants = await ProductVariant.find({ _id: { $in: validVariantIds }, shopId: shop._id }).lean<IProductVariant[]>();
  const vMap = new Map(variants.map((v) => [String(v._id), v]));
  const productIds = [...new Set([...variants.map((v) => String(v.productId))])].map((id) => new Types.ObjectId(id));
  const products = await Product.find({ _id: { $in: productIds }, shopId: shop._id, deletedAt: null }).lean<IProduct[]>();
  const pMap = new Map(products.map((p) => [String(p._id), p]));

  const lines: InternalLine[] = items.map((it) => {
    const variant = vMap.get(it.variantId);
    const product = variant ? pMap.get(String(variant.productId)) : undefined;
    const base: InternalLine = {
      productId: it.productId,
      variantId: it.variantId,
      name: product?.name ?? 'Unavailable item',
      slug: product?.slug ?? '',
      imageUrl: variant?.imageUrl ?? product?.primaryThumbUrl ?? product?.primaryImageUrl,
      colour: variant?.colour?.name,
      size: variant?.size,
      sku: variant?.sku ?? product?.sku ?? '',
      unitPriceMinor: variant?.sellingPriceMinor ?? 0,
      mrpMinor: variant?.mrpMinor || undefined,
      quantity: it.quantity,
      lineTotalMinor: 0,
      available: false,
      maxQuantity: 0,
      categoryId: product?.categoryId ? String(product.categoryId) : null,
      taxPercent: product?.pricing.taxPercent ?? 0,
      taxMinor: 0,
      discountMinor: 0,
      stock: variant?.stock ?? 0,
    };
    if (!variant || !product || String(variant.productId) !== it.productId || !variant.isActive || product.status === 'DRAFT' || product.status === 'ARCHIVED') {
      return { ...base, issue: 'UNAVAILABLE' };
    }
    if (product.pricing.hidePrice) return { ...base, issue: 'PRICE_HIDDEN', unitPriceMinor: 0, mrpMinor: undefined };
    if (product.status === 'OUT_OF_STOCK' || variant.stock <= 0) return { ...base, issue: 'OUT_OF_STOCK' };
    if (it.quantity > variant.stock) return { ...base, issue: 'INSUFFICIENT_STOCK', maxQuantity: variant.stock };
    return { ...base, available: true, maxQuantity: variant.stock, lineTotalMinor: variant.sellingPriceMinor * it.quantity };
  });

  const ok = lines.filter((l) => l.available);
  const discounts = await applyBestOffersAndCoupon(
    shopId,
    ok.map((l) => ({ productId: l.productId, categoryId: l.categoryId, unitPriceMinor: l.unitPriceMinor, qty: l.quantity })),
    input.couponCode,
    { phone: opts.phone },
  );

  ok.forEach((l, i) => {
    const gross = l.unitPriceMinor * l.quantity;
    l.discountMinor = Math.min(gross, discounts.offerDiscounts[i] + discounts.couponDiscounts[i]);
    l.lineTotalMinor = gross - l.discountMinor;
    l.taxMinor = inclusiveTax(l.lineTotalMinor, l.taxPercent);
  });

  const subtotalMinor = ok.reduce((a, l) => a + l.unitPriceMinor * l.quantity, 0);
  const discountMinor = ok.reduce((a, l) => a + l.discountMinor, 0);
  const taxMinor = ok.reduce((a, l) => a + l.taxMinor, 0);
  const shippingMinor = shippingFor(shop, deliveryType, subtotalMinor - discountMinor);

  const cart: PricedCart = {
    lines: lines.map(({ categoryId: _c, taxPercent: _t, taxMinor: _tm, discountMinor: _d, stock: _s, ...pub }) => pub),
    subtotalMinor,
    discountMinor,
    taxMinor,
    shippingMinor,
    totalMinor: subtotalMinor - discountMinor + shippingMinor,
    currency: shop.currency,
    ...(discounts.coupon ? { coupon: { code: discounts.coupon.code, valid: discounts.coupon.valid, message: discounts.coupon.message } } : {}),
  };
  return { cart, lines, couponId: discounts.coupon?.valid ? discounts.coupon.id : undefined, appliedOffers: discounts.appliedOffers, deliveryType };
}

/** Public: price a guest cart. Unavailable / insufficient / hidden-price lines are flagged and excluded from totals. */
export async function priceCart(shopId: string, input: CartInput & { deliveryType?: DeliveryType }): Promise<PricedCart> {
  const shop = await Shop.findById(shopId).select('shippingSettings currency').lean();
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  const { cart } = await computePricing(shop, input, { deliveryType: input.deliveryType });
  return cart;
}
