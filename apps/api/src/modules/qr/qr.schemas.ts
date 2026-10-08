import { z } from 'zod';

export const qrQuery = z.object({
  format: z.enum(['png', 'svg']).default('png'),
  size: z.coerce.number().int().min(128).max(2048).default(512),
  download: z
    .enum(['1', 'true', '0', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});
export const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
export type QrQuery = z.infer<typeof qrQuery>;
