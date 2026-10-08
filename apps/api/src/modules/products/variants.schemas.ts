import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const hex = z.string().trim().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Use a hex colour like #AA3355');
const minor = z.coerce.number().int().min(0).max(1_000_000_000);

export const productIdParam = z.object({ id: objectId });
export const variantParams = z.object({ id: objectId, variantId: objectId });

const variantFields = {
  /** Colour name, or `{ name, hex }`. `colourName` / `colourHex` are accepted as flat alternatives. */
  colour: z.union([z.string().trim().min(1).max(60), z.object({ name: z.string().trim().min(1).max(60), hex: hex.optional() })]),
  colourName: z.string().trim().min(1).max(60),
  colourHex: hex,
  /** Any custom size string (S, M, 38, "5 yards", FREE …). */
  size: z.string().trim().min(1).max(40),
  sku: z.string().trim().min(2).max(60),
  sellingPriceMinor: minor,
  /** Alias of sellingPriceMinor. */
  priceMinor: minor,
  mrpMinor: minor,
  costPriceMinor: minor,
  stock: z.coerce.number().int().min(0).max(10_000_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000),
  barcode: z.string().trim().min(1).max(64),
  imageMediaId: objectId,
  isActive: z.boolean(),
};

export const variantCreateSchema = z
  .object({ ...variantFields })
  .partial()
  .refine((v) => v.sellingPriceMinor !== undefined || v.priceMinor !== undefined, { message: 'sellingPriceMinor is required', path: ['sellingPriceMinor'] });

export const variantUpdateSchema = z
  .object({
    ...variantFields,
    barcode: variantFields.barcode.nullable(),
    imageMediaId: objectId.nullable(),
    lowStockThreshold: variantFields.lowStockThreshold.nullable(),
    /** Note stored on the ADJUSTMENT inventory transaction when `stock` changes. */
    stockReason: z.string().trim().max(250),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export type VariantCreateInput = z.infer<typeof variantCreateSchema>;
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;
