import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { BCRYPT_ROUNDS } from '@/config/constants';
import { User, type IUser } from '@/database/models/user.model';

export type PublicUser = Pick<IUser, 'email' | 'phone' | 'name' | 'role' | 'avatarUrl' | 'isActive' | 'lastLoginAt' | 'createdAt'> & {
  id: string;
  shopId?: string | null;
};

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_ROUNDS);
export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

export const findUserByEmail = (email: string) => User.findOne({ email: normaliseEmail(email) });

/** Loads the user INCLUDING the (normally hidden) password hash. */
export const findUserWithPassword = (filter: { email: string } | { id: string }) =>
  'email' in filter
    ? User.findOne({ email: normaliseEmail(filter.email) }).select('+passwordHash')
    : User.findById(new Types.ObjectId(filter.id)).select('+passwordHash');

export const findUserById = (id: string) => (Types.ObjectId.isValid(id) ? User.findById(id) : Promise.resolve(null));

/** Never includes passwordHash. */
export function toPublicUser(u: IUser): PublicUser {
  return {
    id: String(u._id),
    email: u.email,
    phone: u.phone,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    shopId: u.shopId ? String(u.shopId) : null,
  };
}
