import { Types } from 'mongoose';
import { UPLOAD_LIMITS } from '@/config/constants';
import { env } from '@/config/env';
import { AppError, Errors } from '@/common/errors';
import { isReservedSlug } from '@/common/slug';
import { invalidateShopCache, invalidateSlugCache } from '@/common/utils/cache';
import { Media } from '@/database/models/media.model';
import { Shop, type IShop } from '@/database/models/shop.model';
import { getEffectiveLimits, getUsageSummary } from '@/modules/subscriptions/limits.service';
import { getEffectiveStatus } from '@/modules/subscriptions/subscriptions.service';
import { uploadShopAsset } from '@/modules/media/media.service';
import type { UpdateShopInput } from './shops.schemas';

type Plain = Record<string, unknown>;

/** Flatten nested plain objects into dot-paths so partial nested updates don't clobber siblings. Arrays are replaced whole. */
function flatten(obj: Plain, prefix = '', out: Plain = {}): Plain {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) flatten(v as Plain, key, out);
    else out[key] = v;
  }
  return out;
}

export function toShopDto(s: IShop) {
  const { _id, ...rest } = s as IShop & { __v?: number };
  delete (rest as { __v?: number }).__v;
  return { id: String(_id), ...rest };
}

export async function getShopProfile(shopId: string) {
  const shop = await Shop.findById(shopId).lean();
  if (!shop) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  const [{ plan, subscription }, usage] = await Promise.all([getEffectiveLimits(shopId), getUsageSummary(shopId)]);
  return {
    ...toShopDto(shop),
    usageSummary: usage,
    storageBytes: shop.usage.storageBytes,
    subscription: {
      planCode: plan.code,
      planName: plan.name,
      status: getEffectiveStatus(subscription).status,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    },
  };
}

export async function updateShop(shopId: string, input: UpdateShopInput) {
  const before = await Shop.findById(shopId).lean();
  if (!before) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');

  if (input.slug && input.slug !== before.slug) {
    if (isReservedSlug(input.slug)) throw new AppError(409, 'SLUG_TAKEN', 'This shop URL is reserved. Please choose another.');
    if (await Shop.exists({ slug: input.slug, _id: { $ne: before._id } })) {
      throw new AppError(409, 'SLUG_TAKEN', 'This shop URL is already taken');
    }
  }

  if (input.paymentSettings) {
    const merged = { ...before.paymentSettings, ...input.paymentSettings };
    if (input.paymentSettings.onlineEnabled && env.PAYMENT_PROVIDER === 'none') {
      throw Errors.badRequest('PAYMENT_METHOD_DISABLED', 'Online payments are not configured on this platform yet');
    }
    if (!merged.codEnabled && !merged.onlineEnabled && !merged.payAtShopEnabled) {
      throw Errors.badRequest('VALIDATION_ERROR', 'Enable at least one payment method');
    }
  }
  if (input.shippingSettings) {
    const merged = { ...before.shippingSettings, ...input.shippingSettings };
    if (!merged.deliveryEnabled && !merged.pickupEnabled) throw Errors.badRequest('VALIDATION_ERROR', 'Enable delivery or pickup');
  }

  const $set = flatten(input as Plain);
  const after = await Shop.findByIdAndUpdate(shopId, { $set }, { new: true, runValidators: true }).lean();
  if (!after) throw Errors.notFound('SHOP_NOT_FOUND', 'Shop not found');
  invalidateShopCache(shopId);
  invalidateSlugCache(before.slug, after.slug);

  const changedKeys = Object.keys(input);
  const pick = (s: IShop): Plain => Object.fromEntries(changedKeys.map((k) => [k, (s as unknown as Plain)[k]]));
  return { shop: await getShopProfile(shopId), slugChanged: Boolean(input.slug && input.slug !== before.slug), before: pick(before), after: pick(after) };
}

export async function uploadShopImage(shopId: string, file: Express.Multer.File | undefined, kind: 'logo' | 'cover') {
  if (!file) throw Errors.badRequest('VALIDATION_ERROR', 'An image file is required (multipart field "file")');
  if (!(UPLOAD_LIMITS.imageMimeTypes as readonly string[]).includes(file.mimetype)) {
    throw new AppError(400, 'UPLOAD_INVALID_TYPE', 'Only image files are allowed');
  }
  const result: unknown = await uploadShopAsset(shopId, file, kind);
  const url = typeof result === 'string' ? result : (result as { url?: string } | null)?.url;
  if (!url) throw Errors.internal('Upload failed');
  const field = kind === 'logo' ? 'logoUrl' : 'coverUrl';
  const updated = await Shop.findByIdAndUpdate(shopId, { $set: { [field]: url } }, { new: true }).select('slug').lean();
  invalidateShopCache(shopId);
  invalidateSlugCache(updated?.slug);
  return { [field]: url } as { logoUrl?: string; coverUrl?: string };
}

export async function getShopUsage(shopId: string) {
  const [summary, byKind, shop] = await Promise.all([
    getUsageSummary(shopId),
    Media.aggregate<{ _id: string; count: number; bytes: number }>([
      { $match: { shopId: new Types.ObjectId(shopId) } },
      { $group: { _id: '$kind', count: { $sum: 1 }, bytes: { $sum: '$sizeBytes' } } },
    ]),
    Shop.findById(shopId).select('usage').lean(),
  ]);
  const kind = (k: 'IMAGE' | 'VIDEO') => {
    const row = byKind.find((r) => r._id === k);
    return { count: row?.count ?? 0, bytes: row?.bytes ?? 0 };
  };
  const storageRow = summary.find((r) => r.key === 'storageBytes');
  return {
    usage: summary,
    storage: {
      usedBytes: shop?.usage.storageBytes ?? storageRow?.used ?? 0,
      limitBytes: storageRow?.limit ?? null,
      percent: storageRow?.percent ?? 0,
      images: kind('IMAGE'),
      videos: kind('VIDEO'),
    },
  };
}
