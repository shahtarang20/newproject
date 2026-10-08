import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Types } from 'mongoose';
import { PERMISSIONS, ROLE_PERMISSIONS, type GlobalRole, type Permission } from '@vastra/shared';
import { ACCESS_COOKIE } from '@/config/constants';
import { Shop } from '@/database/models/shop.model';
import { verifyAccessToken } from '@/modules/auth/token.service';
import { Errors } from '../errors';
import type { AuthContext } from '../types';

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || undefined;
  const cookie = (req.cookies as Record<string, string | undefined> | undefined)?.[ACCESS_COOKIE];
  return cookie || undefined;
}

function buildContext(token: string): AuthContext {
  const p = verifyAccessToken(token);
  const permissions: Permission[] =
    p.role === 'SUPER_ADMIN' ? [...PERMISSIONS] : p.staffRole ? [...ROLE_PERMISSIONS[p.staffRole]] : [];
  return { userId: p.sub, role: p.role, shopId: p.shopId, staffRole: p.staffRole, permissions };
}

/** Verifies the access JWT (Bearer header or `access_token` cookie). 401 AUTH_REQUIRED / TOKEN_EXPIRED. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next(Errors.unauthorized());
  try {
    req.auth = buildContext(token);
    return next();
  } catch (err) {
    return next(err); // JWT errors are mapped by errorHandler (TOKEN_EXPIRED / AUTH_REQUIRED)
  }
};

/** Like authenticate but never fails; req.auth is simply left unset on any problem. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.auth = buildContext(token);
    } catch {
      /* ignore invalid token */
    }
  }
  next();
};

export const requireRole =
  (...roles: GlobalRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(Errors.unauthorized());
    if (!roles.includes(req.auth.role)) return next(Errors.forbidden());
    return next();
  };

/**
 * Requires a SHOP_USER bound to a shop (or SUPER_ADMIN impersonating via `X-Shop-Id`).
 * Loads the shop from the DB and sets req.shop. Suspended shops → 403 SHOP_SUSPENDED.
 */
export const requireShop: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const auth = req.auth;
    if (!auth) return next(Errors.unauthorized());

    let shopId = auth.shopId;
    const isAdmin = auth.role === 'SUPER_ADMIN';
    if (isAdmin) {
      const header = req.headers['x-shop-id'];
      const impersonated = typeof header === 'string' ? header : undefined;
      if (!impersonated || !Types.ObjectId.isValid(impersonated)) {
        return next(Errors.forbidden('X-Shop-Id header required for super admin shop access', 'SHOP_NOT_FOUND'));
      }
      shopId = impersonated;
      auth.shopId = impersonated;
      auth.staffRole = 'OWNER';
      auth.permissions = [...ROLE_PERMISSIONS.OWNER];
    } else if (auth.role !== 'SHOP_USER') {
      return next(Errors.forbidden());
    }

    if (!shopId || !Types.ObjectId.isValid(shopId)) return next(Errors.forbidden('No shop associated with this account', 'SHOP_NOT_FOUND'));

    const shop = await Shop.findById(shopId).select('slug status').lean();
    if (!shop) return next(Errors.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    if (shop.status === 'SUSPENDED' && !isAdmin) return next(Errors.forbidden('This shop has been suspended', 'SHOP_SUSPENDED'));

    req.shop = { id: String(shop._id), slug: shop.slug, status: shop.status };
    return next();
  } catch (err) {
    return next(err);
  }
};

/** All listed permissions are required. OWNER (and impersonating SUPER_ADMIN) pass everything. */
export const requirePermission =
  (...perms: Permission[]): RequestHandler =>
  (req, _res, next) => {
    const auth = req.auth;
    if (!auth) return next(Errors.unauthorized());
    if (auth.staffRole === 'OWNER' || auth.role === 'SUPER_ADMIN') return next();
    const missing = perms.filter((p) => !auth.permissions.includes(p));
    if (missing.length) return next(Errors.forbidden(`Missing permission: ${missing.join(', ')}`));
    return next();
  };
