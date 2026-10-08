import type { Request } from 'express';
import { Types } from 'mongoose';
import { Errors } from './errors';

/** Tenant filter derived ONLY from the authenticated context (req.shop → req.auth.shopId). Never from body/query. */
export function tenantFilter(req: Request): { shopId: Types.ObjectId } {
  const id = req.shop?.id ?? req.auth?.shopId;
  if (!id || !Types.ObjectId.isValid(id)) throw Errors.forbidden('Shop context required', 'SHOP_NOT_FOUND');
  return { shopId: new Types.ObjectId(id) };
}

/** Merge extra filter with the tenant filter. */
export function withTenant<T extends Record<string, unknown>>(req: Request, extra?: T): T & { shopId: Types.ObjectId } {
  return { ...(extra ?? ({} as T)), ...tenantFilter(req) };
}

export const toObjectId = (id: string | Types.ObjectId): Types.ObjectId => (typeof id === 'string' ? new Types.ObjectId(id) : id);
