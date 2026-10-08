import { z } from 'zod';
import { FABRICS, GENDERS, OCCASIONS, PRODUCT_STATUSES, PRODUCT_TYPES, SAREE_TYPES, SAREE_WORK_TYPES, SEASONS } from '@vastra/shared';
import { variantCreateSchema } from './variants.schemas';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const bool = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);
const text = (max: number) => z.string().trim().max(max);

export const idParam = z.object({ id: objectId });

const sareeAttrs = z
  .object({
    sareeType: z.enum(SAREE_TYPES),
    fabric: z.enum(FABRICS),
    workTypes: z.array(z.enum(SAREE_WORK_TYPES)).max(10),
    lengthMeters: z.number().min(0).max(50),
    blouseIncluded: z.boolean(),
    blouseDescription: text(500),
    border: text(200),
    pallu: text(200),
    weave: text(200),
    careInstructions: text(1000),
  })
  .partial();

const garmentAttrs = z
  .object({ fit: text(100), pattern: text(100), sleeveType: text(100), neckType: text(100), fabricComposition: text(200), washCare: text(500) })
  .partial();

const pricing = z.object({ taxPercent: z.number().min(0).max(100), hidePrice: z.boolean() }).partial();
const seo = z.object({ title: text(120), description: text(320) }).partial();

const baseShape = {
  type: z.enum(PRODUCT_TYPES),
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().toLowerCase().min(1).max(100),
  sku: z.string().trim().min(2).max(60),
  brand: text(100),
  description: text(10000),
  shortDescription: text(500),
  /** Category (or leaf category). With `subcategoryId` it is the parent category. */
  categoryId: objectId,
  subcategoryId: objectId,
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
  gender: z.enum(GENDERS),
  occasions: z.array(z.enum(OCCASIONS)).max(10),
  fabric: z.enum(FABRICS),
  season: z.enum(SEASONS),
  sareeAttrs,
  garmentAttrs,
  pricing,
  seo,
  isFeatured: z.boolean(),
  lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000),
};

export const createProductSchema = z
  .object({ ...baseShape })
  .partial()
  .extend({
    type: baseShape.type,
    name: baseShape.name,
    /** Only DRAFT is accepted on create — upload images first, then PATCH /:id/status to publish. */
    status: z.literal('DRAFT').optional(),
    variants: z.array(variantCreateSchema).max(200).optional(),
  });

export const updateProductSchema = z
  .object({
    ...baseShape,
    categoryId: objectId.nullable(),
    subcategoryId: objectId.nullable(),
    lowStockThreshold: baseShape.lowStockThreshold.nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const statusSchema = z.object({ status: z.enum(PRODUCT_STATUSES) });

const SORTS = ['createdAt', 'updatedAt', 'name', 'price', 'stockTotal', 'soldCount', 'viewCount'] as const;

export const listProductsQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  type: z.enum(PRODUCT_TYPES).optional(),
  /** Includes products in the category's sub-categories. */
  category: objectId.optional(),
  lowStock: bool.optional(),
  outOfStock: bool.optional(),
  isFeatured: bool.optional(),
  /** e.g. `-createdAt`, `name`, `price`, `-stockTotal` */
  sort: z
    .string()
    .trim()
    .regex(/^-?[a-zA-Z]+$/)
    .refine((s) => (SORTS as readonly string[]).includes(s.replace(/^-/, '')), `sort must be one of ${SORTS.join(', ')}`)
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuery>;
