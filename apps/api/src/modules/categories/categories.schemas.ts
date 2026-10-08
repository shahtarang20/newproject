import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const bool = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);

export const idParam = z.object({ id: objectId });

export const listCategoriesQuery = z.object({
  /** true → nested tree (children[]), default flat list. */
  tree: bool.optional(),
  parentId: z.union([objectId, z.literal('root')]).optional(),
  isActive: bool.optional(),
  q: z.string().trim().max(100).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase().max(80).optional(),
  parentId: objectId.nullish(),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().trim().url().max(1000).optional(),
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: z.string().trim().toLowerCase().min(1).max(80),
    parentId: objectId.nullable(),
    description: z.string().trim().max(1000).nullable(),
    imageUrl: z.string().trim().url().max(1000).nullable(),
    sortOrder: z.coerce.number().int().min(0).max(100000),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const deleteCategoryQuery = z.object({
  /** Category id to move products + child categories to, or `none` (uncategorise products, children become roots). */
  reassignTo: z.union([objectId, z.literal('none')]).optional(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(z.object({ id: objectId, sortOrder: z.coerce.number().int().min(0) })).min(1).max(500),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuery>;
