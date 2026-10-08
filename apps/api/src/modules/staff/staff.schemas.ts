import { z } from 'zod';

export const ASSIGNABLE_ROLES = ['MANAGER', 'SALES', 'INVENTORY', 'ORDER_MANAGER'] as const;
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const inviteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(ASSIGNABLE_ROLES),
});

export const updateStaffSchema = z
  .object({ role: z.enum(ASSIGNABLE_ROLES), active: z.boolean() })
  .partial()
  .refine((v) => v.role !== undefined || v.active !== undefined, 'Nothing to update');

export const idParams = z.object({ id: objectId });

export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(128),
});
