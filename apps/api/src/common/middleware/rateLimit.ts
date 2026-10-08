import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '@/config/env';

const handler = (_req: Request, res: Response): void => {
  res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } });
};

const preset = (windowMs: number, limit: number, extra: Partial<Options> = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    skip: () => env.isTest,
    ...extra,
  });

/** General limiter for the whole API and public storefront reads. */
export const publicRateLimit = preset(60_000, 300);
/** Credential endpoints only (login/register/password flows). Failed-only counting is not used: all attempts count. */
export const authRateLimit = preset(15 * 60_000, 30);
/** Session upkeep (refresh/me/logout) happens on every page load — generous, but still bounded. */
export const sessionRateLimit = preset(60_000, 120);
export const orderRateLimit = preset(60 * 60_000, 20);
export const enquiryRateLimit = preset(60 * 60_000, 20);
