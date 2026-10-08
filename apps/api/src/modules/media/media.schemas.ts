import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const productParams = z.object({ productId: objectId });
export const mediaParams = z.object({ productId: objectId, mediaId: objectId });

/** multipart text fields sent next to the files. A repeated field arrives as an array. */
export const uploadBodySchema = z.object({
  /** Seconds, applied to video files in upload order (optional; no server-side probing). */
  durationSec: z.union([z.coerce.number().min(0).max(36000), z.array(z.coerce.number().min(0).max(36000))]).optional(),
  altText: z.string().trim().max(250).optional(),
});

export const reorderMediaSchema = z.object({ orderedIds: z.array(objectId).min(1).max(100) });

export const updateMediaSchema = z
  .object({
    altText: z.string().trim().max(250).nullable(),
    variantId: objectId.nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export type UploadBody = z.infer<typeof uploadBodySchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
