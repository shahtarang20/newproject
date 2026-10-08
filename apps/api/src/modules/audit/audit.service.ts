import { Types, type FilterQuery } from 'mongoose';
import { buildMeta, parsePagination } from '@/common/pagination';
import { parseDate } from '@/common/utils/date';
import { AuditLog, type IAuditLog } from '@/database/models/audit-log.model';
import { Shop } from '@/database/models/shop.model';
import { User } from '@/database/models/user.model';

export interface AuditQuery {
  shopId?: string;
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: unknown;
  limit?: unknown;
  sort?: unknown;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildAuditFilter(query: AuditQuery, forcedShopId?: string): FilterQuery<IAuditLog> {
  const filter: FilterQuery<IAuditLog> = {};
  const shopId = forcedShopId ?? query.shopId;
  if (shopId && Types.ObjectId.isValid(shopId)) filter.shopId = new Types.ObjectId(shopId);
  if (query.userId && Types.ObjectId.isValid(query.userId)) filter.userId = new Types.ObjectId(query.userId);
  if (query.action) filter.action = { $regex: `^${escapeRegex(query.action)}`, $options: 'i' };
  if (query.entity) filter.entity = query.entity;
  if (query.entityId) filter.entityId = query.entityId;
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  return filter;
}

/** Paginated audit log read. Pass `forcedShopId` for tenant-scoped reads (ignores any shopId in the query). */
export async function listAuditLogs(query: AuditQuery, forcedShopId?: string) {
  const { page, limit, skip, sort } = parsePagination(query as Record<string, unknown>, {
    defaultLimit: 25,
    allowedSort: ['createdAt', 'action', 'entity'],
  });
  const filter = buildAuditFilter(query, forcedShopId);
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const userIds = [...new Set(rows.map((r) => (r.userId ? String(r.userId) : '')).filter(Boolean))];
  const shopIds = [...new Set(rows.map((r) => (r.shopId ? String(r.shopId) : '')).filter(Boolean))];
  const [users, shops] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('name email').lean(),
    Shop.find({ _id: { $in: shopIds } }).select('name slug').lean(),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), { id: String(u._id), name: u.name, email: u.email }]));
  const shopMap = new Map(shops.map((s) => [String(s._id), { id: String(s._id), name: s.name, slug: s.slug }]));

  const items = rows.map((r) => ({
    id: String(r._id),
    action: r.action,
    entity: r.entity,
    entityId: r.entityId ?? null,
    before: r.before ?? null,
    after: r.after ?? null,
    meta: r.meta ?? null,
    ip: r.ip ?? null,
    createdAt: r.createdAt,
    user: r.userId ? (userMap.get(String(r.userId)) ?? { id: String(r.userId) }) : null,
    shop: r.shopId ? (shopMap.get(String(r.shopId)) ?? { id: String(r.shopId) }) : null,
  }));
  return { items, meta: buildMeta(page, limit, total) };
}
