import type { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { UPLOAD_LIMITS } from '@/config/constants';
import { assertStorage, decrementUsage, incrementUsage } from '../subscriptions/limits.service';
import { deleteKeys, processImage, storeSingleImage } from './media.processing';

export interface ShopAsset {
  url: string;
  key: string;
  sizeBytes: number;
  width: number;
  height: number;
}

type UploadedFile = Pick<Express.Multer.File, 'buffer' | 'mimetype' | 'size'>;

const FOLDER = /^[a-z0-9][a-z0-9-]{0,40}$/;

/**
 * Shop-level image (logo, cover, category image …). Counts toward storage only (not the image quota).
 * Stored as one WebP (max 1600px) at `shops/<shopId>/<folder>/<nanoid>.webp`; thumbnails are NOT kept.
 * Returns `sizeBytes` so the caller can persist it and pass it to `deleteShopAsset` when replacing the file.
 */
export async function uploadShopAsset(shopId: string | Types.ObjectId, file: UploadedFile, folder: string): Promise<ShopAsset> {
  if (!FOLDER.test(folder)) throw Errors.badRequest('VALIDATION_ERROR', 'Invalid asset folder');
  if (!(UPLOAD_LIMITS.imageMimeTypes as readonly string[]).includes(file.mimetype)) {
    throw Errors.badRequest('UPLOAD_INVALID_TYPE', 'Only JPEG, PNG, WebP or AVIF images are allowed');
  }
  let processed;
  try {
    processed = await processImage(file.buffer, 1600);
  } catch {
    throw Errors.badRequest('UPLOAD_INVALID_TYPE', 'The uploaded file is not a valid image');
  }
  const bytes = processed.full.buffer.length;
  await assertStorage(shopId, bytes);
  const stored = await storeSingleImage(`shops/${String(shopId)}/${folder}`, processed.full);
  await incrementUsage(shopId, { storageBytes: bytes });
  return { url: stored.url, key: stored.key, sizeBytes: bytes, width: processed.full.width, height: processed.full.height };
}

/** Removes a previously uploaded shop asset and releases its storage usage. */
export async function deleteShopAsset(shopId: string | Types.ObjectId, key: string, sizeBytes = 0): Promise<void> {
  await deleteKeys([key]);
  if (sizeBytes > 0) await decrementUsage(shopId, { storageBytes: sizeBytes });
}
