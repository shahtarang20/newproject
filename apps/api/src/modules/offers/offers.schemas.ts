import { z } from 'zod';
import { DISCOUNT_TYPES } from '@vastra/shared';
import { OFFER_SCOPES } from '@/database/models/offer.model';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const dateish = z.union([z.coerce.date(), z.null()]);

export const idParams = z.object({ id: objectId });

const discountFields = {
  discountType: z.enum(DISCOUNT_TYPES),
  /** PERCENT: 0-100. FLAT: minor units. BUY_X_GET_Y: ignored. */
  value: z.number().min(0).max(100_000_000).default(0),
  maxDiscountMinor: z.number().int().min(0).nullable().optional(),
  minOrderMinor: z.number().int().min(0).default(0),
  startsAt: dateish.optional(),
  endsAt: dateish.optional(),
  isActive: z.boolean().default(true),
};

type DiscountShape = {
  discountType: (typeof DISCOUNT_TYPES)[number];
  value: number;
  buyQty?: number;
  getQty?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

function refineDiscount(v: Partial<DiscountShape>, ctx: z.RefinementCtx): void {
  if (v.discountType === 'PERCENT' && v.value !== undefined && (v.value <= 0 || v.value > 100))
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percent must be between 0 and 100' });
  if (v.discountType === 'FLAT' && v.value !== undefined && v.value <= 0)
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Flat discount must be greater than 0' });
  if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End date must be after start date' });
}

const offerBase = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  badgeText: z.string().trim().max(40).optional(),
  ...discountFields,
  buyQty: z.number().int().min(1).max(100).optional(),
  getQty: z.number().int().min(1).max(100).optional(),
  scope: z.enum(OFFER_SCOPES).default('ALL'),
  productIds: z.array(objectId).max(500).default([]),
  categoryIds: z.array(objectId).max(100).default([]),
});

export const createOfferSchema = offerBase.superRefine((v, ctx) => {
  refineDiscount(v, ctx);
  if (v.discountType === 'BUY_X_GET_Y' && (!v.buyQty || !v.getQty))
    ctx.addIssue({ code: 'custom', path: ['buyQty'], message: 'buyQty and getQty are required for BUY_X_GET_Y' });
  if (v.scope === 'PRODUCTS' && !v.productIds.length) ctx.addIssue({ code: 'custom', path: ['productIds'], message: 'Select at least one product' });
  if (v.scope === 'CATEGORIES' && !v.categoryIds.length) ctx.addIssue({ code: 'custom', path: ['categoryIds'], message: 'Select at least one category' });
});

export const updateOfferSchema = offerBase.partial().superRefine(refineDiscount);

export const listQuery = z.object({
  active: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const couponBase = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, 'Use letters, numbers, - and _ only'),
  description: z.string().trim().max(500).optional(),
  ...discountFields,
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional(),
});

export const createCouponSchema = couponBase.superRefine((v, ctx) => {
  refineDiscount(v, ctx);
  if (v.discountType === 'BUY_X_GET_Y') ctx.addIssue({ code: 'custom', path: ['discountType'], message: 'Coupons support PERCENT or FLAT only' });
});
export const updateCouponSchema = couponBase.omit({ code: true }).partial().superRefine(refineDiscount);

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type OfferListQuery = z.infer<typeof listQuery>;
