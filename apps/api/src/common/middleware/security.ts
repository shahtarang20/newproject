import type { RequestHandler } from 'express';
import { Errors } from '../errors';

const HONEYPOT_FIELD = 'website';
const BURST_WINDOW_MS = 10 * 60_000;
const BURST_MAX = 5;

const hits = new Map<string, number[]>();

// Opportunistic cleanup so the map cannot grow without bound.
setInterval(() => {
  const cutoff = Date.now() - BURST_WINDOW_MS;
  for (const [k, v] of hits) {
    const fresh = v.filter((t) => t > cutoff);
    if (fresh.length) hits.set(k, fresh);
    else hits.delete(k);
  }
}, 5 * 60_000).unref();

/**
 * TODO(captcha): plug in hCaptcha/Turnstile verification here. Until a provider is configured this
 * returns false, so flagged requests are rejected with CAPTCHA_REQUIRED (honest, no fake pass).
 */
export async function verifyCaptcha(_token: string, _ip?: string): Promise<boolean> {
  return false;
}

/** Heuristics: filled honeypot field `website`, or >5 submissions per IP+phone within 10 minutes. Sets req.suspicious. */
export const flagSuspicious: RequestHandler = (req, _res, next) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const honeypot = body[HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim() !== '') req.suspicious = true;

  const phone = typeof body.phone === 'string' ? body.phone : (body.customer as { phone?: string } | undefined)?.phone;
  if (phone) {
    const key = `${req.ip}:${phone}`;
    const now = Date.now();
    const list = (hits.get(key) ?? []).filter((t) => t > now - BURST_WINDOW_MS);
    list.push(now);
    hits.set(key, list);
    if (list.length > BURST_MAX) req.suspicious = true;
  }
  delete body[HONEYPOT_FIELD]; // never let the honeypot leak into services
  next();
};

/** CAPTCHA-ready: only enforced when req.suspicious is set (client then sends `captchaToken`). */
export const suspicionGuard: RequestHandler = async (req, _res, next) => {
  if (!req.suspicious) return next();
  try {
    const token = (req.body as Record<string, unknown> | undefined)?.captchaToken;
    if (typeof token === 'string' && token && (await verifyCaptcha(token, req.ip))) return next();
    return next(Errors.badRequest('CAPTCHA_REQUIRED', 'Please complete the verification challenge and try again'));
  } catch (err) {
    return next(err);
  }
};

/** Convenience chain for public write endpoints (orders, enquiries). */
export const antiSpam: RequestHandler[] = [flagSuspicious, suspicionGuard];
