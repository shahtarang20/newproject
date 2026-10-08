import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { getStorageProvider } from '@/providers/storage/factory';
import { logger } from '@/config/logger';

export interface Rendition {
  buffer: Buffer;
  width: number;
  height: number;
}
export interface ProcessedImage {
  full: Rendition;
  thumb: Rendition;
  tiny: Rendition;
}
export interface StoredFile {
  key: string;
  url: string;
  size: number;
}
export interface StoredImage {
  full: StoredFile;
  thumb: StoredFile;
  tiny: StoredFile;
  width: number;
  height: number;
  /** Sum of all three stored objects (what usage.storageBytes is charged). */
  totalBytes: number;
}

export const FULL_MAX_PX = 2000;
export const THUMB_PX = 480;
export const TINY_PX = 160;

async function render(input: Buffer, maxPx: number, quality: number): Promise<Rendition> {
  const { data, info } = await sharp(input, { failOn: 'error', limitInputPixels: 120_000_000 })
    .rotate() // auto-orient from EXIF, then EXIF is dropped on re-encode
    .resize({ width: maxPx, height: maxPx, fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

/** Auto-rotate, max 2000px WebP + 480px thumb + 160px tiny. Throws if the buffer is not a decodable image. */
export async function processImage(input: Buffer, maxPx = FULL_MAX_PX): Promise<ProcessedImage> {
  const full = await render(input, maxPx, 82);
  const [thumb, tiny] = await Promise.all([render(full.buffer, THUMB_PX, 75), render(full.buffer, TINY_PX, 60)]);
  return { full, thumb, tiny };
}

/** Uploads the three renditions under `<prefix>/<nanoid>[-thumb|-tiny].webp`. Cleans up on partial failure. */
export async function storeImage(prefix: string, img: ProcessedImage): Promise<StoredImage> {
  const storage = getStorageProvider();
  const base = `${prefix}/${nanoid(16)}`;
  const uploaded: string[] = [];
  const put = async (suffix: string, r: Rendition): Promise<StoredFile> => {
    const res = await storage.upload({ buffer: r.buffer, key: `${base}${suffix}.webp`, contentType: 'image/webp' });
    uploaded.push(res.key);
    return { key: res.key, url: res.url, size: r.buffer.length };
  };
  try {
    const [full, thumb, tiny] = await Promise.all([put('', img.full), put('-thumb', img.thumb), put('-tiny', img.tiny)]);
    return { full, thumb, tiny, width: img.full.width, height: img.full.height, totalBytes: full.size + thumb.size + tiny.size };
  } catch (err) {
    await deleteKeys(uploaded);
    throw err;
  }
}

const VIDEO_EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

export async function storeVideo(prefix: string, buffer: Buffer, mime: string): Promise<StoredFile> {
  const res = await getStorageProvider().upload({ buffer, key: `${prefix}/${nanoid(16)}.${VIDEO_EXT[mime] ?? 'mp4'}`, contentType: mime });
  return { key: res.key, url: res.url, size: buffer.length };
}

/** Best-effort deletion: logs and swallows provider errors so DB state stays authoritative. */
export async function deleteKeys(keys: Array<string | undefined | null>): Promise<void> {
  const storage = getStorageProvider();
  await Promise.all(
    keys
      .filter((k): k is string => Boolean(k))
      .map((key) => storage.delete(key).catch((err: unknown) => logger.warn({ err, key }, 'storage delete failed'))),
  );
}

/** Uploads a single WebP rendition (used for shop-level assets that need no thumbnails). */
export async function storeSingleImage(prefix: string, r: Rendition): Promise<StoredFile> {
  const res = await getStorageProvider().upload({ buffer: r.buffer, key: `${prefix}/${nanoid(16)}.webp`, contentType: 'image/webp' });
  return { key: res.key, url: res.url, size: r.buffer.length };
}
