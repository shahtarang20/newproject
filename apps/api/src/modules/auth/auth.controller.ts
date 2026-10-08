import type { Request, Response } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { created, noContent, ok } from '@/common/response';
import { Errors } from '@/common/errors';
import * as auth from './auth.service';
import { clearAuthCookies, readRefreshCookie, setAuthCookies } from './token.service';

const meta = (req: Request): auth.RequestMeta => ({ ip: req.ip, userAgent: req.get('user-agent') ?? undefined });

/** Sets cookies and returns the body-safe session (refresh token only in cookie). */
function sessionBody(res: Response, s: auth.Session) {
  setAuthCookies(res, s.accessToken, s.refreshToken);
  return { user: s.user, shop: s.shop, staffRole: s.staffRole, permissions: s.permissions, accessToken: s.accessToken };
}

export const register = asyncHandler(async (req, res) => {
  created(res, sessionBody(res, await auth.registerShopOwner(req.body, meta(req))), 'Registration successful');
});

export const registerCustomer = asyncHandler(async (req, res) => {
  created(res, sessionBody(res, await auth.registerCustomer(req.body, meta(req))), 'Registration successful');
});

export const login = asyncHandler(async (req, res) => {
  ok(res, sessionBody(res, await auth.login(req.body, meta(req))), 'Login successful');
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    ok(res, sessionBody(res, await auth.refreshSession(readRefreshCookie(req), meta(req))), 'Token refreshed');
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await auth.logout(readRefreshCookie(req));
  clearAuthCookies(res);
  noContent(res);
});

export const me = asyncHandler(async (req, res) => {
  if (!req.auth) throw Errors.unauthorized();
  ok(res, await auth.getMe(req.auth.userId));
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!req.auth) throw Errors.unauthorized();
  ok(res, sessionBody(res, await auth.changePassword(req.auth.userId, req.body, meta(req))), 'Password updated');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await auth.requestPasswordReset((req.body as { email: string }).email);
  noContent(res);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const b = req.body as { token: string; password: string };
  await auth.resetPassword(b.token, b.password);
  noContent(res);
});

export const slugAvailable = asyncHandler(async (req, res) => {
  ok(res, await auth.isSlugAvailable((req.query as { slug: string }).slug));
});
