import type { FilterQuery } from 'mongoose';
import { Errors } from '@/common/errors';
import { buildMeta, parsePagination } from '@/common/pagination';
import { RefreshToken } from '@/database/models/refresh-token.model';
import { Shop } from '@/database/models/shop.model';
import { ShopStaff } from '@/database/models/shop-staff.model';
import { User, type IUser } from '@/database/models/user.model';
import { escapeRegex } from './admin.helpers';

const dto = (u: IUser) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  phone: u.phone ?? null,
  role: u.role,
  isActive: u.isActive,
  shopId: u.shopId ? String(u.shopId) : null,
  lastLoginAt: u.lastLoginAt ?? null,
  createdAt: u.createdAt,
});

export async function listUsers(query: Record<string, unknown> & { q?: string; role?: string; active?: boolean }) {
  const { page, limit, skip, sort } = parsePagination(query, { allowedSort: ['createdAt', 'name', 'email', 'lastLoginAt'] });
  const filter: FilterQuery<IUser> = {};
  if (query.role) filter.role = query.role as IUser['role'];
  if (query.active !== undefined) filter.isActive = query.active;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [rows, total] = await Promise.all([User.find(filter).sort(sort).skip(skip).limit(limit).lean(), User.countDocuments(filter)]);
  const shops = await Shop.find({ _id: { $in: rows.map((r) => r.shopId).filter(Boolean) } }).select('name slug').lean();
  const shopMap = new Map(shops.map((s) => [String(s._id), { id: String(s._id), name: s.name, slug: s.slug }]));
  const items = rows.map((u) => ({ ...dto(u), shop: u.shopId ? (shopMap.get(String(u.shopId)) ?? null) : null }));
  return { items, meta: buildMeta(page, limit, total) };
}

export async function getUser(id: string) {
  const user = await User.findById(id).lean();
  if (!user) throw Errors.notFound('NOT_FOUND', 'User not found');
  const memberships = await ShopStaff.find({ userId: user._id }).lean();
  const shops = await Shop.find({ _id: { $in: memberships.map((m) => m.shopId) } }).select('name slug status').lean();
  const shopMap = new Map(shops.map((s) => [String(s._id), s]));
  return {
    ...dto(user),
    memberships: memberships.map((m) => ({
      shopId: String(m.shopId),
      shopName: shopMap.get(String(m.shopId))?.name ?? null,
      shopSlug: shopMap.get(String(m.shopId))?.slug ?? null,
      role: m.role,
      status: m.status,
    })),
  };
}

export async function setUserActive(actorId: string, id: string, isActive: boolean) {
  const user = await User.findById(id).lean();
  if (!user) throw Errors.notFound('NOT_FOUND', 'User not found');
  if (String(user._id) === actorId) throw Errors.forbidden('You cannot change your own active state');
  if (user.role === 'SUPER_ADMIN') throw Errors.forbidden('Super admins cannot be deactivated here');
  await User.updateOne({ _id: user._id }, { $set: { isActive } });
  if (!isActive) await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return { before: { isActive: user.isActive }, after: { isActive }, user: await getUser(id) };
}
