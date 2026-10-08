import type { Request } from 'express';
import { Types } from 'mongoose';
import { customAlphabet } from 'nanoid';
import type { AuditActor } from '@/common/audit';
import { Errors } from '@/common/errors';

export type Id = string | Types.ObjectId;

export const oid = (id: Id): Types.ObjectId => (typeof id === 'string' ? new Types.ObjectId(id) : id);

export const parseId = (id: string, label = 'id'): Types.ObjectId => {
  if (!Types.ObjectId.isValid(id)) throw Errors.badRequest('VALIDATION_ERROR', `Invalid ${label}`);
  return new Types.ObjectId(id);
};

export const actorOf = (req: Request): AuditActor => ({ userId: req.auth?.userId, shopId: req.shop?.id ?? req.auth?.shopId, ip: req.ip });

/** Lean docs have `_id`; the API contract exposes `id` (string). */
export function withId<T extends { _id: unknown }>(doc: T): Omit<T, '_id' | '__v'> & { id: string } {
  const { _id, ...rest } = doc as T & { __v?: unknown };
  delete (rest as { __v?: unknown }).__v;
  return { ...(rest as Omit<T, '_id' | '__v'>), id: String(_id) };
}

export const isDuplicateKey = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;

/** Retries `fn` when it fails with an E11000 (unique index race); `fn` must recompute its unique values. */
export async function retryOnDuplicate<T>(fn: (attempt: number) => Promise<T>, attempts = 5): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      last = err;
    }
  }
  throw last;
}

const skuToken = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
export const randomToken = (len = 6): string => (len === 6 ? skuToken() : customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', len)());

export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
