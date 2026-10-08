import multer, { type FileFilterCallback } from 'multer';
import type { Request, RequestHandler } from 'express';
import { UPLOAD_LIMITS } from '@/config/constants';
import { AppError } from '../errors';

const allMime: readonly string[] = [...UPLOAD_LIMITS.imageMimeTypes, ...UPLOAD_LIMITS.videoMimeTypes];

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (!allMime.includes(file.mimetype)) {
    return cb(new AppError(400, 'UPLOAD_INVALID_TYPE', `Unsupported file type: ${file.mimetype}`));
  }
  return cb(null, true);
};

const instance = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: UPLOAD_LIMITS.videoMaxBytes, files: 20 },
});

/** multer enforces the global max (video); images get the stricter 10MB cap here. */
const enforceImageSize: RequestHandler = (req, _res, next) => {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files) Object.values(req.files).forEach((arr) => files.push(...arr));
  for (const f of files) {
    if ((UPLOAD_LIMITS.imageMimeTypes as readonly string[]).includes(f.mimetype) && f.size > UPLOAD_LIMITS.imageMaxBytes) {
      return next(new AppError(413, 'UPLOAD_TOO_LARGE', 'Images must be 10MB or smaller'));
    }
  }
  return next();
};

/**
 * Memory-storage upload. Images: jpeg/png/webp/avif ≤ 10MB; video: mp4/webm/quicktime ≤ 100MB.
 * Usage: `uploadMiddleware.single('file')`, `.array('files', 10)`.
 */
export const uploadMiddleware = {
  single: (field: string): RequestHandler[] => [instance.single(field), enforceImageSize],
  array: (field: string, max = 10): RequestHandler[] => [instance.array(field, max), enforceImageSize],
};

export const isVideoMime = (mime: string): boolean => (UPLOAD_LIMITS.videoMimeTypes as readonly string[]).includes(mime);
