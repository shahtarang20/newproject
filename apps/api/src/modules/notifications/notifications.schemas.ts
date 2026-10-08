import { z } from 'zod';

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  unread: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
