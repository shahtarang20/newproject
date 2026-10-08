import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { CookieOptions, Request, Response } from 'express';
import type { GlobalRole, StaffRole } from '@vastra/shared';
import { env } from '@/config/env';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
} from '@/config/constants';
import { Errors } from '@/common/errors';

export interface AccessTokenPayload {
  sub: string;
  role: GlobalRole;
  shopId?: string;
  staffRole?: StaffRole;
}

export interface RefreshTokenPayload {
  sub: string;
  fid: string; // rotation family id
  jti: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` } as SignOptions);
}

/** Throws jsonwebtoken errors (TokenExpiredError / JsonWebTokenError) — mapped by the error handler. */
export function verifyAccessToken(token: string): AccessTokenPayload & JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload & JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload & JwtPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & JwtPayload;
  } catch {
    throw Errors.unauthorized('Invalid or expired refresh token', 'AUTH_REQUIRED');
  }
}

const baseCookie = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie(), path: '/', maxAge: ACCESS_COOKIE_MAX_AGE_MS });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie(),
    path: REFRESH_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: REFRESH_COOKIE_PATH });
}

export const readRefreshCookie = (req: Request): string | undefined => {
  const c = (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE];
  return c || undefined;
};
