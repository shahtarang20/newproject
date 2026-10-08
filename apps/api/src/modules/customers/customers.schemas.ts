import { z } from 'zod';
import { PHONE_REGEX } from '@/common/utils/phone';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectId });

const email = z.string().trim().toLowerCase().email().max(254);
const tags = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((a) => [...new Set(a)]);

export const listCustomersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(40).optional(),
  sort: z.enum(['newest', 'totalSpent', 'lastOrderAt', 'name']).default('newest'),
  dir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListCustomersQuery = z.infer<typeof listCustomersQuery>;

export const exportCustomersQuery = listCustomersQuery.pick({ q: true, tag: true, sort: true, dir: true });

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(PHONE_REGEX, 'Invalid phone number'),
  email: email.optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(2000).optional(),
  tags: tags.optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: email.nullable().or(z.literal('')),
    notes: z.string().trim().max(2000).nullable(),
    tags,
    isBlocked: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
