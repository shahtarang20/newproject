import type { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { Errors } from '@/common/errors';
import { audit, type AuditActor } from '@/common/audit';
import { UPLOAD_LIMITS } from '@/config/constants';
import { logger } from '@/config/logger';
import { Media, type IMedia } from '@/database/models/media.model';
import { Product } from '@/database/models/product.model';
import { ProductVariant } from '@/database/models/product-variant.model';
import { getStorageProvider } from '@/providers/storage/factory';
import { assertStorage, assertWithinLimit, decrementUsage, incrementUsage } from '../subscriptions/limits.service';
import { oid, withId } from '../products/product.utils';
import { deleteKeys, processImage, storeImage, storeVideo, type ProcessedImage, type StoredFile, type StoredImage } from './media.processing';
import { syncProductMedia } from './media.sync';
import type { UpdateMediaInput } from './media.schemas';

export { uploadShopAsset, deleteShopAsset } from './media.assets';
export { syncProductMedia } from './media.sync';

type UploadedFile = Pick<Express.Multer.File, 'buffer' | 'mimetype' | 'size' | 'originalname'>;

const isImageMime = (m: string): boolean => (UPLOAD_LIMITS.imageMimeTypes as readonly string[]).includes(m);
const isVideoMime = (m: string): boolean => (UPLOAD_LIMITS.videoMimeTypes as readonly string[]).includes(m);

async function assertProduct(shopId: Types.ObjectId, productId: Types.ObjectId): Promise<void> {
  if (!(await Product.exists({ _id: productId, shopId, deletedAt: null }))) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
}

const keysOf = (m: Pick<IMedia, 'key' | 'thumbKey' | 'tinyKey'>): string[] => [m.key, m.thumbKey, m.tinyKey].filter((k): k is string => Boolean(k));

export async function listMedia(shopId: Types.ObjectId, productId: Types.ObjectId) {
  await assertProduct(shopId, productId);
  const items = await Media.find({ shopId, productId }).sort({ sortOrder: 1, createdAt: 1 }).lean();
  return items.map((m) => withId(m));
}

export interface UploadOptions {
  durations: number[];
  altText?: string;
  userId?: string;
}

/**
 * Validates → processes images (sharp) → checks plan limits (images, videos, storage) → uploads → records.
 * Nothing is uploaded unless every limit passes; uploaded objects are removed again if a later step fails.
 */
export async function uploadProductMedia(
  shopId: Types.ObjectId,
  productId: Types.ObjectId,
  files: UploadedFile[],
  opts: UploadOptions,
  actor: AuditActor,
) {
  await assertProduct(shopId, productId);
  if (!files.length) throw Errors.badRequest('VALIDATION_ERROR', 'No files received. Send multipart/form-data with field "files".');
  for (const f of files) {
    if (!isImageMime(f.mimetype) && !isVideoMime(f.mimetype)) throw Errors.badRequest('UPLOAD_INVALID_TYPE', `Unsupported file type: ${f.mimetype}`);
  }

  const processed = new Map<UploadedFile, ProcessedImage>();
  for (const f of files.filter((x) => isImageMime(x.mimetype))) {
    try {
      processed.set(f, await processImage(f.buffer));
    } catch {
      throw Errors.badRequest('UPLOAD_INVALID_TYPE', `"${f.originalname}" is not a valid image`);
    }
  }
  const imageCount = processed.size;
  const videoCount = files.length - imageCount;
  const totalBytes =
    [...processed.values()].reduce((n, p) => n + p.full.buffer.length + p.thumb.buffer.length + p.tiny.buffer.length, 0) +
    files.filter((f) => isVideoMime(f.mimetype)).reduce((n, f) => n + f.buffer.length, 0);

  if (imageCount) await assertWithinLimit(shopId, 'images', imageCount);
  if (videoCount) await assertWithinLimit(shopId, 'videos', videoCount);
  await assertStorage(shopId, totalBytes);

  const prefix = `shops/${String(shopId)}/products/${String(productId)}`;
  const uploadedKeys: string[] = [];
  const docs: Array<Partial<IMedia>> = [];
  let videoIdx = 0;
  const last = await Media.findOne({ shopId, productId }).sort({ sortOrder: -1 }).select('sortOrder').lean();
  let order = last ? last.sortOrder + 1 : 0;
  const provider = getStorageProvider().name;

  try {
    for (const f of files) {
      const base = { shopId, productId, provider, mimeType: f.mimetype, altText: opts.altText, isPrimary: false, sortOrder: order++, uploadedBy: opts.userId ? oid(opts.userId) : undefined };
      if (isImageMime(f.mimetype)) {
        const stored: StoredImage = await storeImage(prefix, processed.get(f) as ProcessedImage);
        uploadedKeys.push(stored.full.key, stored.thumb.key, stored.tiny.key);
        docs.push({
          ...base,
          kind: 'IMAGE',
          url: stored.full.url,
          key: stored.full.key,
          thumbUrl: stored.thumb.url,
          thumbKey: stored.thumb.key,
          tinyUrl: stored.tiny.url,
          tinyKey: stored.tiny.key,
          width: stored.width,
          height: stored.height,
          sizeBytes: stored.totalBytes,
        });
      } else {
        // TODO(video-thumbnail): videos are stored as-is (no transcoding, no poster frame / thumbUrl yet).
        const stored: StoredFile = await storeVideo(prefix, f.buffer, f.mimetype);
        uploadedKeys.push(stored.key);
        docs.push({ ...base, kind: 'VIDEO', url: stored.url, key: stored.key, sizeBytes: stored.size, durationSec: opts.durations[videoIdx++] });
      }
    }
    const created = await Media.insertMany(docs);
    await syncProductMedia(productId, shopId);
    await incrementUsage(shopId, { images: imageCount, videos: videoCount, storageBytes: totalBytes });
    void audit(actor, { action: 'media.upload', entity: 'Product', entityId: productId, meta: { images: imageCount, videos: videoCount, bytes: totalBytes } });
    return created.map((m) => withId(m.toObject()));
  } catch (err) {
    await deleteKeys(uploadedKeys);
    throw err;
  }
}

async function findMedia(shopId: Types.ObjectId, productId: Types.ObjectId, mediaId: Types.ObjectId) {
  const m = await Media.findOne({ _id: mediaId, shopId, productId });
  if (!m) throw Errors.notFound('NOT_FOUND', 'Media not found');
  return m;
}

export async function reorderMedia(shopId: Types.ObjectId, productId: Types.ObjectId, orderedIds: string[], actor: AuditActor) {
  await assertProduct(shopId, productId);
  const existing = await Media.find({ shopId, productId }).sort({ sortOrder: 1, createdAt: 1 }).select('_id').lean();
  const known = new Set(existing.map((m) => String(m._id)));
  const unique = [...new Set(orderedIds)];
  if (unique.some((id) => !known.has(id))) throw Errors.badRequest('VALIDATION_ERROR', 'orderedIds contains media that does not belong to this product');
  const rest = existing.map((m) => String(m._id)).filter((id) => !unique.includes(id));
  const finalOrder = [...unique, ...rest];
  await Media.bulkWrite(finalOrder.map((id, i) => ({ updateOne: { filter: { _id: oid(id), shopId, productId }, update: { $set: { sortOrder: i } } } })));
  await syncProductMedia(productId, shopId);
  void audit(actor, { action: 'media.reorder', entity: 'Product', entityId: productId });
  return listMedia(shopId, productId);
}

export async function setPrimary(shopId: Types.ObjectId, productId: Types.ObjectId, mediaId: Types.ObjectId, actor: AuditActor) {
  const m = await findMedia(shopId, productId, mediaId);
  if (m.kind !== 'IMAGE') throw Errors.badRequest('VALIDATION_ERROR', 'Only an image can be the primary media');
  await Media.updateMany({ shopId, productId, _id: { $ne: mediaId } }, { $set: { isPrimary: false } });
  await Media.updateOne({ _id: mediaId }, { $set: { isPrimary: true } });
  await syncProductMedia(productId, shopId);
  void audit(actor, { action: 'media.primary', entity: 'Product', entityId: productId, after: { mediaId } });
  return listMedia(shopId, productId);
}

export async function updateMedia(shopId: Types.ObjectId, productId: Types.ObjectId, mediaId: Types.ObjectId, input: UpdateMediaInput, actor: AuditActor) {
  const m = await findMedia(shopId, productId, mediaId);
  const $set: Record<string, unknown> = {};
  if (input.altText !== undefined) $set.altText = input.altText ?? undefined;

  if (input.variantId !== undefined) {
    if (input.variantId === null) {
      $set.variantId = null;
      if (m.variantId) await ProductVariant.updateOne({ _id: m.variantId, shopId, imageMediaId: m._id }, { $set: { imageMediaId: null }, $unset: { imageUrl: 1 } });
    } else {
      if (m.kind !== 'IMAGE') throw Errors.badRequest('VALIDATION_ERROR', 'Only images can be linked to a variant');
      const variantId = oid(input.variantId);
      if (!(await ProductVariant.exists({ _id: variantId, shopId, productId }))) throw Errors.badRequest('INVALID_VARIANT', 'Variant not found on this product');
      $set.variantId = variantId;
      await ProductVariant.updateOne({ _id: variantId, shopId }, { $set: { imageMediaId: m._id, imageUrl: m.thumbUrl ?? m.url } });
    }
  }
  await Media.updateOne({ _id: mediaId }, { $set });
  await syncProductMedia(productId, shopId);
  void audit(actor, { action: 'media.update', entity: 'Media', entityId: mediaId, after: input });
  return withId((await Media.findById(mediaId).lean()) as IMedia);
}

export async function deleteMedia(shopId: Types.ObjectId, productId: Types.ObjectId, mediaId: Types.ObjectId, actor: AuditActor): Promise<void> {
  const m = await findMedia(shopId, productId, mediaId);
  await Media.deleteOne({ _id: mediaId });
  await ProductVariant.updateMany({ shopId, imageMediaId: mediaId }, { $set: { imageMediaId: null }, $unset: { imageUrl: 1 } });
  await syncProductMedia(productId, shopId);
  await deleteKeys(keysOf(m));
  await decrementUsage(shopId, { [m.kind === 'IMAGE' ? 'images' : 'videos']: 1, storageBytes: m.sizeBytes });
  void audit(actor, { action: 'media.delete', entity: 'Product', entityId: productId, before: { mediaId, kind: m.kind, key: m.key } });
}

/** Deletes every media object + record of a product and releases usage. Caller resets the Product's embedded refs. */
export async function removeAllProductMedia(shopId: Types.ObjectId, productId: Types.ObjectId): Promise<{ images: number; videos: number; bytes: number }> {
  const items = await Media.find({ shopId, productId }).lean();
  if (!items.length) return { images: 0, videos: 0, bytes: 0 };
  await Media.deleteMany({ shopId, productId });
  await deleteKeys(items.flatMap((m) => keysOf(m)));
  const images = items.filter((m) => m.kind === 'IMAGE').length;
  const bytes = items.reduce((n, m) => n + m.sizeBytes, 0);
  await decrementUsage(shopId, { images, videos: items.length - images, storageBytes: bytes });
  logger.debug({ productId: String(productId), removed: items.length }, 'product media removed');
  return { images, videos: items.length - images, bytes };
}

export interface CopyResult {
  copied: number;
  skipped: number;
  reason?: string;
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Duplicate support: physically copies each source object (download via its public URL → upload under the
 * new product's key prefix) so deleting either product never breaks the other. Plan limits are checked up front;
 * if they would be exceeded or a download fails, those items are skipped and reported (never shared by URL).
 */
export async function copyProductMedia(shopId: Types.ObjectId, fromProductId: Types.ObjectId, toProductId: Types.ObjectId, userId?: string): Promise<CopyResult> {
  const src = await Media.find({ shopId, productId: fromProductId }).sort({ sortOrder: 1, createdAt: 1 }).lean();
  if (!src.length) return { copied: 0, skipped: 0 };
  const images = src.filter((m) => m.kind === 'IMAGE').length;
  const videos = src.length - images;
  const bytes = src.reduce((n, m) => n + m.sizeBytes, 0);
  try {
    if (images) await assertWithinLimit(shopId, 'images', images);
    if (videos) await assertWithinLimit(shopId, 'videos', videos);
    await assertStorage(shopId, bytes);
  } catch (err) {
    return { copied: 0, skipped: src.length, reason: err instanceof Error ? err.message : 'Plan limit reached' };
  }

  const storage = getStorageProvider();
  const prefix = `shops/${String(shopId)}/products/${String(toProductId)}`;
  const uploadedKeys: string[] = [];
  const docs: Array<Partial<IMedia>> = [];
  let used = { images: 0, videos: 0, bytes: 0 };
  let skipped = 0;
  const copyOne = async (url: string, contentType: string, suffix: string, ext: string) => {
    const buffer = await download(url);
    const res = await storage.upload({ buffer, key: `${prefix}/${suffix}.${ext}`, contentType });
    uploadedKeys.push(res.key);
    return { ...res, size: buffer.length };
  };
  for (const m of src) {
    try {
      const id = nanoid(16);
      const ext = m.kind === 'IMAGE' ? 'webp' : (m.key.split('.').pop() ?? 'mp4');
      const full = await copyOne(m.url, m.mimeType, id, ext);
      let size = full.size;
      let thumb: { url: string; key: string } | undefined;
      let tiny: { url: string; key: string } | undefined;
      if (m.kind === 'IMAGE' && m.thumbUrl) {
        const t = await copyOne(m.thumbUrl, 'image/webp', `${id}-thumb`, 'webp');
        thumb = t;
        size += t.size;
      }
      if (m.kind === 'IMAGE' && m.tinyUrl) {
        const t = await copyOne(m.tinyUrl, 'image/webp', `${id}-tiny`, 'webp');
        tiny = t;
        size += t.size;
      }
      docs.push({
        shopId, productId: toProductId, kind: m.kind, url: full.url, key: full.key, thumbUrl: thumb?.url, thumbKey: thumb?.key, tinyUrl: tiny?.url, tinyKey: tiny?.key,
        provider: storage.name, mimeType: m.mimeType, sizeBytes: size, width: m.width, height: m.height, durationSec: m.durationSec, altText: m.altText,
        isPrimary: m.isPrimary, sortOrder: m.sortOrder, uploadedBy: userId ? oid(userId) : undefined,
      });
      used = { images: used.images + (m.kind === 'IMAGE' ? 1 : 0), videos: used.videos + (m.kind === 'VIDEO' ? 1 : 0), bytes: used.bytes + size };
    } catch (err) {
      skipped++;
      logger.warn({ err, mediaId: String(m._id) }, 'media copy failed; skipped');
    }
  }
  if (docs.length) {
    await Media.insertMany(docs);
    await incrementUsage(shopId, { images: used.images, videos: used.videos, storageBytes: used.bytes });
    await syncProductMedia(toProductId, shopId);
  }
  return { copied: docs.length, skipped, ...(skipped ? { reason: 'Some files could not be copied' } : {}) };
}
