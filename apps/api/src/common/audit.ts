import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLog } from '@/database/models/audit-log.model';
import { logger } from '@/config/logger';

export interface AuditActor {
  userId?: string;
  shopId?: string;
  ip?: string;
}

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | Types.ObjectId;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}

const oid = (v?: string): Types.ObjectId | null => (v && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : null);

const isRequest = (a: Request | AuditActor): a is Request => 'headers' in a;

/** Fire-and-forget safe: never throws and never blocks the request on failure. */
export async function audit(actor: Request | AuditActor, entry: AuditEntry): Promise<void> {
  try {
    const a: AuditActor = isRequest(actor)
      ? { userId: actor.auth?.userId, shopId: actor.shop?.id ?? actor.auth?.shopId, ip: actor.ip }
      : actor;
    await AuditLog.create({
      shopId: oid(a.shopId),
      userId: oid(a.userId),
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ? String(entry.entityId) : undefined,
      before: entry.before,
      after: entry.after,
      meta: entry.meta,
      ip: a.ip,
    });
  } catch (err) {
    logger.warn({ err, action: entry.action }, 'audit log write failed');
  }
}
