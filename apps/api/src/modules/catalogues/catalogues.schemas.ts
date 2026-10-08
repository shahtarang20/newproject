import { z } from 'zod';
import { SLUG_PATTERN } from '@/common/slug';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const productIds = z.array(objectId).max(500);

export const idParams = z.object({ id: objectId });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  published: z.enum(['true', 'false']).optional(),
  sort: z.enum(['sortOrder', 'name', '-name', 'createdAt', '-createdAt', '-viewCount']).default('sortOrder'),
});

export const createBody = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase().min(1).max(80).regex(SLUG_PATTERN, 'Lowercase letters, numbers and hyphens only').optional(),
  description: z.string().trim().max(2000).optional(),
  /** URL of an existing media/asset. For a fresh upload use POST /catalogues/:id/cover. */
  coverUrl: z.string().url().max(1000).nullable().optional(),
  productIds: productIds.optional(),
  isPublished: z.boolean().optional(),
  /** Categories this catalogue highlights. */
  categoryIds: z.array(objectId).max(50).optional(),
  /** Optional visibility window (ISO date/time). null clears it. */
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  layout: z.enum(['grid', 'masonry', 'list', 'editorial']).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

const dateOrder = (b: { startDate?: Date | null; endDate?: Date | null }): boolean => !b.startDate || !b.endDate || b.startDate <= b.endDate;
const dateOrderIssue = { message: 'endDate must be on or after startDate', path: ['endDate'] };

export const createCatalogueBody = createBody.refine(dateOrder, dateOrderIssue);
export const updateBody = createBody.partial().refine(dateOrder, dateOrderIssue);

export const setProductsBody = z.object({ productIds });
export const addProductsBody = z.object({ productIds: z.array(objectId).min(1).max(500) });
export const removeProductsBody = addProductsBody;

export type CreateBody = z.infer<typeof createBody>;
export type UpdateBody = z.infer<typeof updateBody>;
export type ListQuery = z.infer<typeof listQuery>;
