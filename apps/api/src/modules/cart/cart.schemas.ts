import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const cartLineSchema = z.object({
  productId: objectId,
  variantId: objectId,
  quantity: z.number().int().min(1).max(100),
});

export const priceCartSchema = z.object({
  items: z.array(cartLineSchema).min(1, 'Cart is empty').max(50),
  couponCode: z.string().trim().max(32).optional(),
  /** Optional. Defaults to DELIVERY (or PICKUP when the shop has delivery disabled). PICKUP has no shipping charge. */
  deliveryType: z.enum(['DELIVERY', 'PICKUP']).optional(),
});

export type PriceCartInput = z.infer<typeof priceCartSchema>;
