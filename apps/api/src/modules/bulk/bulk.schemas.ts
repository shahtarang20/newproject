import { z } from 'zod';
import { PRODUCT_STATUSES, PRODUCT_TYPES } from '@vastra/shared';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const flag = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((v) => v === true || v === 'true' || v === '1');

/** Multipart text fields that accompany the CSV `file`. */
export const csvOptionsBody = z.object({
  createMissingCategories: flag,
  /** What to do when a row's sku already exists in the shop. */
  duplicateSku: z.enum(['error', 'skip', 'update']).default('error'),
  /** import only: abort the whole import (write nothing) if any row is invalid. */
  abortOnErrors: flag,
});
export type CsvOptions = z.infer<typeof csvOptionsBody>;

export const priceBody = z
  .object({
    productIds: z.array(objectId).min(1).max(1000).optional(),
    filter: z
      .object({
        categoryId: objectId.optional(),
        status: z.enum(PRODUCT_STATUSES).optional(),
        type: z.enum(PRODUCT_TYPES).optional(),
      })
      .optional(),
    mode: z.enum(['SET', 'INCREASE_PERCENT', 'DECREASE_PERCENT', 'INCREASE_FLAT']),
    /** SET / INCREASE_FLAT: integer minor units (paise). *_PERCENT: percentage (0-1000). */
    value: z.number().finite().min(0),
    /** Which price field(s) to change. Default SELLING. */
    target: z.enum(['SELLING', 'MRP', 'BOTH']).default('SELLING'),
  })
  .superRefine((b, ctx) => {
    if (!b.productIds && !b.filter) ctx.addIssue({ code: 'custom', message: 'Provide productIds or filter', path: ['productIds'] });
    if (b.productIds && b.filter) ctx.addIssue({ code: 'custom', message: 'Provide either productIds or filter, not both', path: ['filter'] });
    if ((b.mode === 'SET' || b.mode === 'INCREASE_FLAT') && !Number.isInteger(b.value)) ctx.addIssue({ code: 'custom', message: 'value must be an integer (minor units)', path: ['value'] });
    if (b.mode.endsWith('_PERCENT') && b.value > 1000) ctx.addIssue({ code: 'custom', message: 'percent must be <= 1000', path: ['value'] });
    if (b.mode === 'DECREASE_PERCENT' && b.value > 100) ctx.addIssue({ code: 'custom', message: 'percent must be <= 100', path: ['value'] });
  });

export const stockBody = z.object({
  items: z
    .array(
      z
        .object({
          variantId: objectId.optional(),
          sku: z.string().trim().min(1).max(64).optional(),
          quantity: z.number().int().min(-1_000_000).max(1_000_000),
          mode: z.enum(['SET', 'ADD']),
          reason: z.string().trim().max(200).optional(),
        })
        .refine((i) => !!i.variantId !== !!i.sku, { message: 'Provide exactly one of variantId or sku' })
        .refine((i) => i.mode !== 'SET' || i.quantity >= 0, { message: 'SET quantity must be 0 or more' }),
    )
    .min(1)
    .max(1000),
});

export const statusBody = z.object({
  productIds: z.array(objectId).min(1).max(1000),
  status: z.enum(PRODUCT_STATUSES),
});

export type PriceBody = z.infer<typeof priceBody>;
export type StockBody = z.infer<typeof stockBody>;
export type StatusBody = z.infer<typeof statusBody>;
