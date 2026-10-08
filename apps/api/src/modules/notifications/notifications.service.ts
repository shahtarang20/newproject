import { Types, type FilterQuery } from 'mongoose';
import { buildMeta, parsePagination } from '@/common/pagination';
import { Errors } from '@/common/errors';
import type { AuthContext } from '@/common/types';
import { Notification, type INotification } from '@/database/models/notification.model';

/** Scope: shop users see shop-level (userId null) + their own notifications; others only their own. */
function scopeFor(auth: AuthContext): FilterQuery<INotification> {
  const userId = new Types.ObjectId(auth.userId);
  if (auth.role === 'SHOP_USER' && auth.shopId && Types.ObjectId.isValid(auth.shopId)) {
    return { shopId: new Types.ObjectId(auth.shopId), $or: [{ userId: null }, { userId }] };
  }
  return { userId };
}

const toDto = (n: INotification) => ({
  id: String(n._id),
  type: n.type,
  title: n.title,
  body: n.body,
  data: n.data ?? null,
  channels: n.channels,
  read: Boolean(n.readAt),
  readAt: n.readAt ?? null,
  createdAt: n.createdAt,
});

export async function listNotifications(auth: AuthContext, query: { page?: unknown; limit?: unknown; unread?: boolean }) {
  const { page, limit, skip } = parsePagination(query as Record<string, unknown>, { defaultLimit: 20, maxLimit: 50 });
  const scope = scopeFor(auth);
  const filter: FilterQuery<INotification> = query.unread ? { ...scope, readAt: null } : scope;
  const [rows, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...scope, readAt: null }),
  ]);
  return { items: rows.map(toDto), unreadCount, meta: buildMeta(page, limit, total) };
}

export async function markRead(auth: AuthContext, id: string) {
  const res = await Notification.updateOne({ ...scopeFor(auth), _id: new Types.ObjectId(id) }, { $set: { readAt: new Date() } });
  if (res.matchedCount === 0) throw Errors.notFound('NOT_FOUND', 'Notification not found');
}

export async function markAllRead(auth: AuthContext): Promise<number> {
  const res = await Notification.updateMany({ ...scopeFor(auth), readAt: null }, { $set: { readAt: new Date() } });
  return res.modifiedCount;
}
