import { z } from 'zod';

export const RANGES = ['7d', '30d', '90d', '365d'] as const;
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/** Either `range` (default 30d) or an explicit `from`/`to` (UTC days, inclusive, max 366 days). */
const rangeFields = {
  range: z.enum(RANGES).default('30d'),
  from: dateStr.optional(),
  to: dateStr.optional(),
};

export const dashboardQuery = z.object({ range: z.enum(['7d', '30d', '90d']).default('30d') });
export const rangeQuery = z.object(rangeFields);

export const salesQuery = z.object({ ...rangeFields, groupBy: z.enum(['day', 'week', 'month']).default('day') });

export const productsQuery = z.object({
  ...rangeFields,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['views', 'addToCart', 'orders', 'revenue', 'quantity']).default('revenue'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type DashboardQuery = z.infer<typeof dashboardQuery>;
export type RangeQuery = z.infer<typeof rangeQuery>;
export type SalesQuery = z.infer<typeof salesQuery>;
export type ProductsQuery = z.infer<typeof productsQuery>;
