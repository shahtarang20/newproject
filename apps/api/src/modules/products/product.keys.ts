import type { Types } from 'mongoose';
import { Product } from '@/database/models/product.model';
import { Errors } from '@/common/errors';
import { isDuplicateKey, randomToken } from './product.utils';

export const normaliseSku = (sku: string): string => sku.trim().toUpperCase();

/** `SAR-7K2M9Q` — 3 letters from the name + 6 unambiguous chars. Caller still relies on the unique index (retry on E11000). */
export function generateSku(name: string, prefix?: string): string {
  const letters = (prefix ?? name).replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
  return `${letters}-${randomToken(6)}`;
}

/** Pre-check for explicit SKUs for a friendlier error; the unique index remains the real guard. */
export async function assertSkuFree(shopId: Types.ObjectId, sku: string, excludeId?: Types.ObjectId): Promise<void> {
  const filter: Record<string, unknown> = { shopId, sku };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Product.exists(filter)) throw Errors.conflict('CONFLICT', `SKU "${sku}" is already used by another product`);
}

export const skuConflict = (err: unknown, sku: string) => (isDuplicateKey(err) ? Errors.conflict('CONFLICT', `SKU "${sku}" is already in use`) : err);
