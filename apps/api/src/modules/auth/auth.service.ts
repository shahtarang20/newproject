import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '@/config/constants';
import { Types } from 'mongoose';
import { ROLE_PERMISSIONS, pickRandomTemplateId, type Permission, type StaffRole } from '@vastra/shared';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { AppError, Errors } from '@/common/errors';
import { isReservedSlug, slugify, SLUG_PATTERN, uniqueSlug } from '@/common/slug';
import { sha256 } from '@/common/utils/hash';
import { derivePrefix } from '@/common/utils/order-number';
import { addMonths, addDays } from '@/common/utils/date';
import { normalisePhone } from '@/common/utils/phone';
import { RefreshToken } from '@/database/models/refresh-token.model';
import { Shop, type IShop } from '@/database/models/shop.model';
import { ShopStaff } from '@/database/models/shop-staff.model';
import { Subscription } from '@/database/models/subscription.model';
import { User, type IUser } from '@/database/models/user.model';
import { ensureDefaultPlan } from '@/modules/subscriptions/plan.bootstrap';
import { findUserWithPassword, hashPassword, normaliseEmail, toPublicUser, verifyPassword, type PublicUser } from '@/modules/users/user.service';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './token.service';
import type { ChangePasswordInput, LoginInput, RegisterCustomerInput, RegisterInput } from './auth.schemas';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface ShopSummary {
  id: string;
  name: string;
  slug: string;
  status: IShop['status'];
  logoUrl?: string;
  currency: string;
  theme: IShop['theme'];
}

export interface Session {
  user: PublicUser;
  shop?: ShopSummary;
  staffRole?: StaffRole;
  permissions: Permission[];
  accessToken: string;
  /** Raw refresh token — controller puts it in the HTTP-only cookie, never in the JSON body. */
  refreshToken: string;
}

const REUSE_GRACE_MS = 10_000;
// Real hash used to equalise timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), BCRYPT_ROUNDS);

const summariseShop = (s: IShop): ShopSummary => ({
  id: String(s._id),
  name: s.name,
  slug: s.slug,
  status: s.status,
  logoUrl: s.logoUrl,
  currency: s.currency,
  theme: s.theme,
});

async function issueRefreshToken(userId: string, familyId: string, meta: RequestMeta): Promise<{ token: string; hash: string }> {
  const token = signRefreshToken({ sub: userId, fid: familyId, jti: crypto.randomUUID() });
  const hash = sha256(token);
  await RefreshToken.create({
    userId: new Types.ObjectId(userId),
    tokenHash: hash,
    familyId,
    expiresAt: addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS),
    userAgent: meta.userAgent?.slice(0, 300),
    ip: meta.ip,
  });
  return { token, hash };
}

/** Resolve the shop + staff role for a SHOP_USER and mint tokens. */
async function buildSession(user: IUser, meta: RequestMeta, familyId: string = crypto.randomUUID()): Promise<Session> {
  let shop: IShop | null = null;
  let staffRole: StaffRole | undefined;
  if (user.role === 'SHOP_USER') {
    const memberships = await ShopStaff.find({ userId: user._id, status: 'ACTIVE' }).sort({ createdAt: 1 }).lean();
    const preferred = memberships.find((m) => user.shopId && String(m.shopId) === String(user.shopId)) ?? memberships[0];
    if (preferred) {
      staffRole = preferred.role;
      shop = await Shop.findById(preferred.shopId).lean();
    }
  }
  const permissions: Permission[] = staffRole ? [...ROLE_PERMISSIONS[staffRole]] : [];
  const userId = String(user._id);
  const accessToken = signAccessToken({ sub: userId, role: user.role, shopId: shop ? String(shop._id) : undefined, staffRole });
  const { token } = await issueRefreshToken(userId, familyId, meta);
  return { user: toPublicUser(user), shop: shop ? summariseShop(shop) : undefined, staffRole, permissions, accessToken, refreshToken: token };
}

export async function isSlugAvailable(raw: string): Promise<{ available: boolean; slug: string; reason?: string; suggestion?: string }> {
  const slug = slugify(raw);
  if (slug.length < 3 || !SLUG_PATTERN.test(slug)) return { available: false, slug, reason: 'INVALID' };
  if (isReservedSlug(slug)) return { available: false, slug, reason: 'RESERVED', suggestion: await uniqueSlug(Shop, `${slug}-shop`, {}, 'slug', { reserved: true }) };
  if (await Shop.exists({ slug })) {
    return { available: false, slug, reason: 'TAKEN', suggestion: await uniqueSlug(Shop, slug, {}, 'slug', { reserved: true }) };
  }
  return { available: true, slug };
}

export async function registerShopOwner(input: RegisterInput, meta: RequestMeta): Promise<Session> {
  const email = normaliseEmail(input.email);
  if (await User.exists({ email })) throw Errors.conflict('CONFLICT', 'An account with this email already exists');

  let slug: string;
  if (input.shopSlug) {
    const check = await isSlugAvailable(input.shopSlug);
    if (!check.available) throw new AppError(409, 'SLUG_TAKEN', 'This shop URL is not available', { suggestion: check.suggestion });
    slug = check.slug;
  } else {
    slug = await uniqueSlug(Shop, input.shopName, {}, 'slug', { reserved: true });
  }

  const plan = await ensureDefaultPlan();
  const userId = new Types.ObjectId();
  const shopId = new Types.ObjectId();
  const now = new Date();

  try {
    const passwordHash = await hashPassword(input.password);
    const user = await User.create({
      _id: userId,
      email,
      name: input.name,
      phone: input.phone ? normalisePhone(input.phone) : undefined,
      passwordHash,
      role: 'SHOP_USER',
      shopId,
    });

    const subscriptionId = new Types.ObjectId();
    await Shop.create({
      _id: shopId,
      name: input.shopName,
      slug,
      businessType: input.businessType ?? 'FASHION_STORE',
      orderPrefix: derivePrefix(input.shopName),
      contact: { email, phone: input.phone ? normalisePhone(input.phone) : undefined },
      theme: { templateId: pickRandomTemplateId(), buttonStyle: 'rounded', catalogueLayout: 'grid' },
      ownerId: userId,
      subscriptionId,
      status: 'ACTIVE',
      usage: { staff: 1, periodStart: now },
    });

    await ShopStaff.create({ shopId, userId, role: 'OWNER', status: 'ACTIVE' });

    const trialing = plan.trialDays > 0;
    await Subscription.create({
      _id: subscriptionId,
      shopId,
      planId: plan._id,
      status: trialing ? 'TRIALING' : 'ACTIVE',
      interval: 'MONTHLY',
      currentPeriodStart: now,
      trialEndsAt: trialing ? addDays(now, plan.trialDays) : null,
      // The default (free) plan never expires; paid-default trials end at trialEndsAt.
      currentPeriodEnd: trialing ? addDays(now, plan.trialDays) : plan.priceMinor.MONTHLY > 0 ? addMonths(now, 1) : null,
      limitOverrides: {},
    });

    return await buildSession(user.toObject() as IUser, meta);
  } catch (err) {
    // Standalone Mongo has no transactions: compensate manually so a failed signup leaves no orphans.
    await Promise.allSettled([
      Subscription.deleteMany({ shopId }),
      ShopStaff.deleteMany({ shopId }),
      Shop.deleteOne({ _id: shopId }),
      User.deleteOne({ _id: userId }),
    ]);
    throw err;
  }
}

export async function registerCustomer(input: RegisterCustomerInput, meta: RequestMeta): Promise<Session> {
  const email = normaliseEmail(input.email);
  if (await User.exists({ email })) throw Errors.conflict('CONFLICT', 'An account with this email already exists');
  const user = await User.create({
    email,
    name: input.name,
    phone: input.phone ? normalisePhone(input.phone) : undefined,
    passwordHash: await hashPassword(input.password),
    role: 'CUSTOMER',
  });
  return buildSession(user.toObject() as IUser, meta);
}

export async function login(input: LoginInput, meta: RequestMeta): Promise<Session> {
  const user = await findUserWithPassword({ email: input.email });
  const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw Errors.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  if (!user.isActive) throw Errors.forbidden('This account has been deactivated');
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return buildSession(user.toObject() as IUser, meta);
}

/** Rotation with reuse detection: presenting an already-rotated token revokes the entire family. */
export async function refreshSession(rawToken: string | undefined, meta: RequestMeta): Promise<Session> {
  if (!rawToken) throw Errors.unauthorized('Refresh token missing');
  const payload = verifyRefreshToken(rawToken);
  const hash = sha256(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash: hash }).lean();
  if (!stored) throw Errors.unauthorized('Invalid refresh token');

  if (stored.revokedAt) {
    // Benign race (parallel tabs) inside a short grace window: just reject. Otherwise treat as theft.
    if (Date.now() - stored.revokedAt.getTime() > REUSE_GRACE_MS) {
      await RefreshToken.updateMany({ familyId: stored.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
      logger.warn({ userId: payload.sub, familyId: stored.familyId }, 'refresh token reuse detected — family revoked');
    }
    throw Errors.unauthorized('Refresh token has been revoked');
  }
  if (stored.expiresAt.getTime() <= Date.now()) throw Errors.unauthorized('Refresh token expired');

  // Atomically claim the token so only one concurrent request can rotate it.
  const claimed = await RefreshToken.findOneAndUpdate({ _id: stored._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  if (!claimed) throw Errors.unauthorized('Refresh token has been revoked');

  const user = await User.findById(stored.userId).lean();
  if (!user || !user.isActive) throw Errors.unauthorized('Account unavailable');

  const session = await buildSession(user, meta, stored.familyId);
  await RefreshToken.updateOne({ _id: stored._id }, { $set: { replacedByHash: sha256(session.refreshToken) } });
  return session;
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const stored = await RefreshToken.findOne({ tokenHash: sha256(rawToken) }).lean();
  if (stored) await RefreshToken.updateMany({ familyId: stored.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function getMe(userId: string): Promise<Omit<Session, 'accessToken' | 'refreshToken'>> {
  const user = await User.findById(userId).lean();
  if (!user || !user.isActive) throw Errors.unauthorized('Account unavailable');
  let shop: IShop | null = null;
  let staffRole: StaffRole | undefined;
  if (user.role === 'SHOP_USER') {
    const memberships = await ShopStaff.find({ userId: user._id, status: 'ACTIVE' }).sort({ createdAt: 1 }).lean();
    const m = memberships.find((x) => user.shopId && String(x.shopId) === String(user.shopId)) ?? memberships[0];
    if (m) {
      staffRole = m.role;
      shop = await Shop.findById(m.shopId).lean();
    }
  }
  return {
    user: toPublicUser(user),
    shop: shop ? summariseShop(shop) : undefined,
    staffRole,
    permissions: staffRole ? [...ROLE_PERMISSIONS[staffRole]] : [],
  };
}

export async function changePassword(userId: string, input: ChangePasswordInput, meta: RequestMeta): Promise<Session> {
  const user = await findUserWithPassword({ id: userId });
  if (!user) throw Errors.unauthorized();
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw Errors.badRequest('INVALID_CREDENTIALS', 'Current password is incorrect');
  }
  user.passwordHash = await hashPassword(input.newPassword);
  user.passwordChangedAt = new Date();
  await user.save();
  // Sign out every other device, then start a fresh session for this one.
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return buildSession(user.toObject() as IUser, meta);
}

/** TODO(password-reset): generate a single-use hashed token (new collection/field), email it via notifications, then implement reset. */
export async function requestPasswordReset(_email: string): Promise<never> {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'Password reset is not available yet');
}

/** TODO(password-reset): verify token, set new password, revoke all refresh tokens. */
export async function resetPassword(_token: string, _password: string): Promise<never> {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'Password reset is not available yet');
}
