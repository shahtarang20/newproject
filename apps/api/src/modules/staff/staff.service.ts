import { Types } from 'mongoose';
import { PERMISSIONS, ROLE_PERMISSIONS, STAFF_ROLES, type StaffRole } from '@vastra/shared';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { Errors } from '@/common/errors';
import { randomToken, sha256 } from '@/common/utils/hash';
import { addDays } from '@/common/utils/date';
import { normalisePhone } from '@/common/utils/phone';
import { RefreshToken } from '@/database/models/refresh-token.model';
import { Shop } from '@/database/models/shop.model';
import { ShopStaff } from '@/database/models/shop-staff.model';
import { User } from '@/database/models/user.model';
import { getEmailProvider } from '@/providers/notifications/factory';
import { assertWithinLimit, decrementUsage, incrementUsage } from '@/modules/subscriptions/limits.service';
import { hashPassword, normaliseEmail } from '@/modules/users/user.service';
import { StaffInvite } from './staff-invite.model';
import { ASSIGNABLE_ROLES } from './staff.schemas';

const INVITE_TTL_DAYS = 7;

export interface StaffDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: 'ACTIVE' | 'DISABLED';
  invitePending: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);

async function loadStaffDtos(shopId: string, filter: Record<string, unknown> = {}): Promise<StaffDto[]> {
  const rows = await ShopStaff.find({ shopId: oid(shopId), ...filter }).sort({ createdAt: 1 }).lean();
  const userIds = rows.map((r) => r.userId);
  const [users, invites] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('name email phone lastLoginAt').lean(),
    StaffInvite.find({ shopId: oid(shopId), userId: { $in: userIds } }).select('userId').lean(),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const pending = new Set(invites.map((i) => String(i.userId)));
  return rows.map((r) => {
    const u = userMap.get(String(r.userId));
    return {
      id: String(r._id),
      userId: String(r.userId),
      name: u?.name ?? 'Unknown',
      email: u?.email ?? '',
      phone: u?.phone ?? null,
      role: r.role,
      status: r.status,
      invitePending: pending.has(String(r.userId)),
      lastLoginAt: u?.lastLoginAt ?? null,
      createdAt: r.createdAt,
    };
  });
}

export const listStaff = (shopId: string): Promise<StaffDto[]> => loadStaffDtos(shopId);

export function getPermissionsMap() {
  return {
    permissions: PERMISSIONS,
    roles: Object.fromEntries(STAFF_ROLES.map((r) => [r, ROLE_PERMISSIONS[r]])) as Record<StaffRole, readonly string[]>,
    assignableRoles: ASSIGNABLE_ROLES,
  };
}

async function createInviteAndEmail(shopId: string, userId: Types.ObjectId, user: { name: string; email: string }, role: StaffRole): Promise<void> {
  const token = randomToken(32);
  await StaffInvite.deleteMany({ shopId: oid(shopId), userId });
  await StaffInvite.create({ shopId: oid(shopId), userId, tokenHash: sha256(token), expiresAt: addDays(new Date(), INVITE_TTL_DAYS) });
  const shop = await Shop.findById(shopId).select('name').lean();
  const link = `${env.FRONTEND_URL.replace(/\/$/, '')}/accept-invite?token=${token}`;
  try {
    await getEmailProvider().send({
      to: user.email,
      subject: `You have been invited to ${shop?.name ?? 'a shop'} on Vastra`,
      body: `Hi ${user.name},\n\nYou have been invited to join ${shop?.name ?? 'a shop'} as ${role.replace('_', ' ').toLowerCase()}.\nSet your password to get started (link valid for ${INVITE_TTL_DAYS} days):\n\n${link}\n`,
      templateKey: 'STAFF_INVITE',
      data: { link, role, shopName: shop?.name },
    });
  } catch (err) {
    // The invite exists; the owner can resend. Never leak the token.
    logger.warn({ err, userId: String(userId) }, 'staff invite email failed');
  }
}

export async function inviteStaff(shopId: string, invitedBy: string, input: { name: string; email: string; phone?: string; role: StaffRole }) {
  const email = normaliseEmail(input.email);
  if (await User.exists({ email })) throw Errors.conflict('CONFLICT', 'A user with this email already exists');
  await assertWithinLimit(shopId, 'staff');

  const user = await User.create({
    email,
    name: input.name,
    phone: input.phone ? normalisePhone(input.phone) : undefined,
    passwordHash: await hashPassword(randomToken(24)), // unusable until the invite is accepted
    role: 'SHOP_USER',
    shopId: oid(shopId),
  });
  try {
    await ShopStaff.create({ shopId: oid(shopId), userId: user._id, role: input.role, status: 'ACTIVE', invitedBy: oid(invitedBy) });
  } catch (err) {
    await User.deleteOne({ _id: user._id });
    throw err;
  }
  await incrementUsage(shopId, 'staff');
  await createInviteAndEmail(shopId, user._id, { name: user.name, email }, input.role);
  const [dto] = await loadStaffDtos(shopId, { userId: user._id });
  return dto;
}

async function getMember(shopId: string, id: string) {
  const member = await ShopStaff.findOne({ _id: oid(id), shopId: oid(shopId) });
  if (!member) throw Errors.notFound('NOT_FOUND', 'Staff member not found');
  return member;
}

export async function resendInvite(shopId: string, id: string) {
  const member = await getMember(shopId, id);
  const invite = await StaffInvite.exists({ shopId: oid(shopId), userId: member.userId });
  if (!invite) throw Errors.badRequest('VALIDATION_ERROR', 'This staff member has already accepted the invite');
  const user = await User.findById(member.userId).select('name email').lean();
  if (!user) throw Errors.notFound('NOT_FOUND', 'User not found');
  await createInviteAndEmail(shopId, member.userId, user, member.role);
}

export async function updateStaff(shopId: string, actorUserId: string, id: string, input: { role?: StaffRole; active?: boolean }) {
  const member = await getMember(shopId, id);
  if (member.role === 'OWNER') throw Errors.forbidden('The shop owner cannot be modified');
  if (String(member.userId) === actorUserId) throw Errors.forbidden('You cannot change your own role or status');
  const before = { role: member.role, status: member.status };
  if (input.role) member.role = input.role;
  if (input.active !== undefined) member.status = input.active ? 'ACTIVE' : 'DISABLED';
  await member.save();
  if (member.status === 'DISABLED' || input.role) {
    // Role is embedded in the access token; force a fresh login so changes apply (and disabled users lose access).
    await RefreshToken.updateMany({ userId: member.userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  const [dto] = await loadStaffDtos(shopId, { _id: member._id });
  return { staff: dto, before, after: { role: member.role, status: member.status } };
}

export async function removeStaff(shopId: string, actorUserId: string, id: string) {
  const member = await getMember(shopId, id);
  if (member.role === 'OWNER') throw Errors.forbidden('The shop owner cannot be removed');
  if (String(member.userId) === actorUserId) throw Errors.forbidden('You cannot remove yourself');
  await ShopStaff.deleteOne({ _id: member._id });
  await decrementUsage(shopId, 'staff');
  await RefreshToken.updateMany({ userId: member.userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  const pending = await StaffInvite.exists({ shopId: oid(shopId), userId: member.userId });
  await StaffInvite.deleteMany({ shopId: oid(shopId), userId: member.userId });
  // Never-activated invitees have no data of their own: remove the placeholder account.
  const remaining = await ShopStaff.exists({ userId: member.userId });
  if (pending && !remaining) await User.deleteOne({ _id: member.userId });
  else await User.updateOne({ _id: member.userId, shopId: oid(shopId) }, { $set: { shopId: null } });
  return { userId: String(member.userId), role: member.role };
}

export async function acceptInvite(token: string, password: string) {
  const invite = await StaffInvite.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
  if (!invite) throw Errors.badRequest('VALIDATION_ERROR', 'This invitation link is invalid or has expired');
  const member = await ShopStaff.findOne({ shopId: invite.shopId, userId: invite.userId }).lean();
  if (!member) {
    await StaffInvite.deleteOne({ _id: invite._id });
    throw Errors.badRequest('VALIDATION_ERROR', 'This invitation is no longer valid');
  }
  const claimed = await StaffInvite.findOneAndDelete({ _id: invite._id });
  if (!claimed) throw Errors.badRequest('VALIDATION_ERROR', 'This invitation has already been used');
  const user = await User.findByIdAndUpdate(
    invite.userId,
    { $set: { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), emailVerifiedAt: new Date(), isActive: true } },
    { new: true },
  ).lean();
  if (!user) throw Errors.notFound('NOT_FOUND', 'User not found');
  return { email: user.email, shopId: String(invite.shopId), userId: String(invite.userId) };
}
