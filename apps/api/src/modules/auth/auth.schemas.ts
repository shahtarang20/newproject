import { z } from 'zod';
import { BUSINESS_TYPES } from '@vastra/shared';
import { PHONE_REGEX } from '@/common/utils/phone';
import { SLUG_PATTERN } from '@/common/slug';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain a letter and a number');
const phone = z.string().trim().regex(PHONE_REGEX, 'Invalid phone number');
const slug = z.string().trim().toLowerCase().min(3).max(40).regex(SLUG_PATTERN, 'Use lowercase letters, numbers and hyphens');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password,
  phone: phone.optional(),
  shopName: z.string().trim().min(2).max(120),
  shopSlug: slug.optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
});

export const registerCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password,
  phone: phone.optional(),
});

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });

export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });

export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(10).max(256), password });

export const slugAvailableQuery = z.object({ slug: z.string().trim().toLowerCase().min(1).max(60) });

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
