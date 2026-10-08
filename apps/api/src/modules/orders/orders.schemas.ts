import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@vastra/shared';
import { PHONE_REGEX } from '@/common/utils/phone';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const phone = z.string().trim().regex(PHONE_REGEX, 'Invalid phone number');

const itemSchema = z.object({
  productId: objectId,
  variantId: objectId,
  quantity: z.number().int().min(1).max(100),
});

const addressSchema = z.object({
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().min(3).max(12),
  country: z.string().trim().max(60).default('IN'),
});

const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone,
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal('').transform(() => undefined)),
});

const orderBase = z.object({
  items: z.array(itemSchema).min(1, 'Cart is empty').max(50),
  couponCode: z.string().trim().max(32).optional(),
  customer: customerSchema,
  deliveryType: z.enum(['DELIVERY', 'PICKUP']).default('DELIVERY'),
  address: addressSchema.optional(),
  paymentMethod: z.enum(['ONLINE', 'COD', 'PAY_AT_SHOP']),
  notes: z.string().trim().max(1000).optional(),
  /** Honeypot — must stay empty/absent. */
  website: z.string().max(200).optional(),
});

const requireAddress = (v: { deliveryType: string; address?: unknown }, ctx: z.RefinementCtx): void => {
  if (v.deliveryType === 'DELIVERY' && !v.address) ctx.addIssue({ code: 'custom', path: ['address'], message: 'Delivery address is required' });
};

/** POST /storefront/:slug/orders (matches web PlaceOrderRequest). */
export const placeOrderSchema = orderBase.superRefine(requireAddress);
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

/** POST /storefront/:slug/orders/track */
export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  phone,
});
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;

/** POST /orders (dashboard walk-in order). Online payment is not available here. */
export const createDashboardOrderSchema = orderBase
  .omit({ website: true, paymentMethod: true, deliveryType: true })
  .extend({
    deliveryType: z.enum(['DELIVERY', 'PICKUP']).default('PICKUP'),
    paymentMethod: z.enum(['COD', 'PAY_AT_SHOP']).default('PAY_AT_SHOP'),
    /** Walk-in customer already paid in full. */
    markPaid: z.boolean().default(false),
  })
  .superRefine(requireAddress);
export type CreateDashboardOrderInput = z.infer<typeof createDashboardOrderSchema>;

export const idParams = z.object({ id: objectId });

const csv = (values: readonly string[]) =>
  z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean))
    .refine((arr) => arr.every((x) => values.includes(x)), 'Invalid value');

export const listOrdersQuery = z.object({
  /** Comma separated statuses, e.g. `PENDING` or `CONFIRMED,PROCESSING`. Omit for all. */
  status: csv(ORDER_STATUSES).optional(),
  paymentStatus: csv(PAYMENT_STATUSES).optional(),
  paymentMethod: z.enum(['ONLINE', 'COD', 'PAY_AT_SHOP']).optional(),
  /** Matches order number, customer name or phone. */
  search: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(['createdAt', '-createdAt', 'totalMinor', '-totalMinor']).default('-createdAt'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const updatePaymentSchema = z.object({
  status: z.enum(['PAID', 'REFUNDED']),
  note: z.string().trim().max(500).optional(),
  /** REFUNDED only: also call the payment provider's refund API (online payments). */
  refundViaProvider: z.boolean().default(false),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const updateNotesSchema = z.object({ internalNote: z.string().trim().max(2000) });
export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
