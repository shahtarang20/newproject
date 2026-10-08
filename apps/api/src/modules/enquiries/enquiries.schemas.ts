import { z } from 'zod';
import { ENQUIRY_STATUSES } from '@vastra/shared';
import { PHONE_REGEX } from '@/common/utils/phone';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParams = z.object({ id: objectId });

/** Public enquiry body (POST /storefront/:slug/enquiries). `website` is the honeypot (stripped by antiSpam). */
export const createEnquirySchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(PHONE_REGEX, 'Invalid phone number'),
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal('').transform(() => undefined)),
  productId: objectId.optional(),
  variantId: objectId.optional(),
  question: z.string().trim().min(3).max(1500),
});
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

export const listEnquiriesQuery = z.object({
  status: z.enum([...ENQUIRY_STATUSES, 'ALL']).optional(),
  q: z.string().trim().max(100).optional(),
  productId: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListEnquiriesQuery = z.infer<typeof listEnquiriesQuery>;

export const updateEnquirySchema = z
  .object({
    status: z.enum(ENQUIRY_STATUSES).optional(),
    response: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((v) => v.status !== undefined || v.response !== undefined, 'Provide status and/or response');
export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;
