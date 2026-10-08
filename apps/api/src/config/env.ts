import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load the repo-root .env (apps/api/src/config → ../../../../.env) and, as a fallback, apps/api/.env.
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const emptyToUndefined = (v: unknown): unknown => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optStr = z.preprocess(emptyToUndefined, z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/vastra'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  BACKEND_URL: z.string().url().default('http://localhost:4000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

  JWT_SECRET: optStr,
  JWT_REFRESH_SECRET: optStr,
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: optStr,

  STORAGE_PROVIDER: z.enum(['local', 'cloudinary', 's3', 'r2']).default('local'),
  CLOUDINARY_CLOUD_NAME: optStr,
  CLOUDINARY_API_KEY: optStr,
  CLOUDINARY_API_SECRET: optStr,
  S3_BUCKET: optStr,
  S3_REGION: optStr,
  S3_ACCESS_KEY_ID: optStr,
  S3_SECRET_ACCESS_KEY: optStr,
  S3_ENDPOINT: optStr,
  S3_PUBLIC_BASE_URL: optStr,

  PAYMENT_PROVIDER: z.enum(['razorpay', 'stripe', 'none']).default('none'),
  RAZORPAY_KEY_ID: optStr,
  RAZORPAY_KEY_SECRET: optStr,
  RAZORPAY_WEBHOOK_SECRET: optStr,
  STRIPE_SECRET_KEY: optStr,
  STRIPE_WEBHOOK_SECRET: optStr,

  WHATSAPP_PROVIDER: z.enum(['none', 'meta']).default('none'),
  WHATSAPP_API_KEY: optStr,
  WHATSAPP_PHONE_NUMBER_ID: optStr,
  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  EMAIL_API_KEY: optStr,
  EMAIL_FROM: z.string().default('Vastra <no-reply@example.com>'),

  SEED_SUPER_ADMIN_EMAIL: z.string().default('admin@example.com'),
  SEED_SUPER_ADMIN_PASSWORD: optStr,
  SEED_SHOP_OWNER_EMAIL: z.string().default('owner@example.com'),
  SEED_SHOP_OWNER_PASSWORD: optStr,
  SEED_CUSTOMER_EMAIL: z.string().default('customer@example.com'),
  SEED_CUSTOMER_PASSWORD: optStr,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}
const raw = parsed.data;
const isProd = raw.NODE_ENV === 'production';

if (isProd) {
  const missing = (['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const).filter((k) => !raw[k] || (raw[k] as string).length < 32);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(`FATAL: ${missing.join(', ')} must be set (min 32 chars) in production.`);
    process.exit(1);
  }
}

// Dev-only fallbacks. Never used in production (guarded above).
const DEV_ACCESS = 'dev-only-access-secret-change-me-0123456789';
const DEV_REFRESH = 'dev-only-refresh-secret-change-me-0123456789';

export const env = {
  ...raw,
  JWT_SECRET: raw.JWT_SECRET ?? DEV_ACCESS,
  JWT_REFRESH_SECRET: raw.JWT_REFRESH_SECRET ?? DEV_REFRESH,
  isProd,
  isDev: raw.NODE_ENV === 'development',
  isTest: raw.NODE_ENV === 'test',
};

export type Env = typeof env;
