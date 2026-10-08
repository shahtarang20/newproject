import { z } from 'zod';
import { ANALYTICS_EVENT_TYPES, GENDERS } from '@vastra/shared';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** `?colour=Red&colour=Blue` and `?colour=Red,Blue` are both accepted. */
const csvList = z.preprocess(
  (v) => {
    if (v === undefined || v === '') return undefined;
    const arr = Array.isArray(v) ? v : [v];
    return arr
      .flatMap((x) => String(x).split(','))
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
  },
  z.array(z.string().max(60)).optional(),
);

const boolish = z.preprocess((v) => (v === 'true' || v === '1' || v === true ? true : v === 'false' || v === '0' || v === false ? false : v), z.boolean().optional());

export const slugParams = z.object({ slug: z.string().trim().toLowerCase().min(1).max(80) });

export const productsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().toLowerCase().max(120).optional(),
  catalogue: z.string().trim().toLowerCase().max(120).optional(),
  colour: csvList,
  size: csvList,
  fabric: csvList,
  brand: csvList,
  occasion: csvList,
  gender: z.string().trim().toUpperCase().pipe(z.enum(GENDERS)).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: boolish,
  onOffer: boolish,
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'discount']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(20),
});
export type ProductsQuery = z.infer<typeof productsQuerySchema>;

export const productSlugParams = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(80),
  productSlug: z.string().trim().toLowerCase().min(1).max(200),
});

export const catalogueSlugParams = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(80),
  catalogueSlug: z.string().trim().toLowerCase().min(1).max(200),
});

export const cartPriceSchema = z.object({
  items: z
    .array(z.object({ productId: objectId, variantId: objectId, quantity: z.coerce.number().int().min(1).max(100) }))
    .min(1)
    .max(50),
  couponCode: z.string().trim().max(40).optional(),
});

export const eventSchema = z.object({
  type: z.enum(ANALYTICS_EVENT_TYPES),
  productId: objectId.optional(),
  catalogueId: objectId.optional(),
  sessionId: z.string().trim().max(64).optional(),
  meta: z
    .record(z.unknown())
    .refine((m) => JSON.stringify(m).length <= 2000, 'meta too large')
    .optional(),
});

export const verifyPaymentSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  payload: z.record(z.unknown()),
});
