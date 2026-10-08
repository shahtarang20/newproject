import { z } from 'zod';
import { BUSINESS_TYPES, RESERVED_SHOP_SLUGS } from '@vastra/shared';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/\d/, 'Include at least one number'),
  shopName: z.string().trim().min(2, 'Enter your shop name').max(80),
  shopSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Use at least 3 characters')
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens')
    .refine((v) => !(RESERVED_SHOP_SLUGS as readonly string[]).includes(v), 'That link is reserved'),
  businessType: z.enum(BUSINESS_TYPES, { errorMap: () => ({ message: 'Choose your business type' }) }),
});
export type RegisterForm = z.input<typeof registerSchema>;
export type RegisterOutput = z.output<typeof registerSchema>;
